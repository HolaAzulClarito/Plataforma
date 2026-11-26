/* Examen final: un solo examen por curso (ADR-005). El servidor elige las preguntas, mide el tiempo y califica. */
import { randomUUID } from "node:crypto";
import {
  attemptsLeft,
  canIssueCertificate,
  EXAM_GRACE_SECONDS,
  finalGrade,
  gradeAnswers,
  inRange,
  isoToMx,
  isPassing,
  lessonsDone,
  maxAttempts,
  mxToIso,
  normalize,
  type AnswerDetail,
  type AttemptDetail,
  type AttemptRequest,
  type AttemptRequestRow,
  type AttemptRow,
  type DateRange,
  type ExamResult,
  type ExamSession,
  type ExamStatus,
  type ExamSubmitRequest,
  type Question,
} from "@kiron/shared";
import { db, nextId, type AttemptRecord } from "../../store";
import { hoyIso, hoyMx, now } from "../../lib/clock";
import { badRequest, conflict, forbidden, notFound } from "../../lib/http";
import { courseTitle, examOf, getCourse, isVisible, type CourseRef } from "../cursos/service";
import { hasApprovedEnrollment } from "../inscripciones/service";
import { awardRule } from "../club/service";
import { certificateFor, issueCertificate, summary } from "../constancias/service";

const key = (u: string, s: string) => `${u}|${s}`;

/* Curso visible + inscripción aprobada. Sin esto no hay contenido, avance ni examen. */
export const requireAccess = (u: string, slug: string): CourseRef => {
  const r = getCourse(slug);
  if (!isVisible(r)) throw notFound("Curso no disponible");
  if (!hasApprovedEnrollment(u, slug)) throw forbidden("Necesitas una inscripción aprobada para entrar a este curso");
  return r;
};

export const attemptsOf = (u: string, s: string): AttemptRecord[] =>
  db()
    .intentos.filter((a) => a.u === u && a.s === s)
    .sort((a, b) => a.n - b.n);

/* Cierra como no aprobados (0.0) los intentos abiertos cuyo tiempo ya venció, con la tolerancia de red. */
const expireStale = (u: string, s: string): void => {
  const t = now().getTime();
  for (const a of attemptsOf(u, s))
    if (a.estado === "en_curso" && a.venceEn !== null && t > a.venceEn + EXAM_GRACE_SECONDS * 1000) {
      a.estado = "expirado";
      a.nota = 0;
      a.ok = false;
      a.t = Math.round((a.venceEn - (a.iniciadaEn ?? a.venceEn)) / 1000);
      a.sesion = null;
    }
};

export const maxFor = (r: CourseRef, u: string): number => maxAttempts(examOf(r).config.intentos, db().extra[key(u, r.course.slug)] ?? 0);

export const isPassed = (u: string, s: string): boolean => attemptsOf(u, s).some((a) => a.estado === "calificado" && a.ok);

export const finalNoteOf = (r: CourseRef, u: string): number | null => {
  const notas = attemptsOf(u, r.course.slug)
    .filter((a) => a.estado !== "en_curso")
    .map((a) => a.nota);
  return finalGrade(notas, examOf(r).config.calculo) ?? null;
};

const doneOf = (u: string, s: string): number[] => db().avance.find((a) => a.u === u && a.s === s)?.done ?? [];

const publicSession = (r: CourseRef, a: AttemptRecord, max: number): ExamSession => {
  const { config, preguntas } = examOf(r);
  return {
    id: a.sesion!,
    intento: a.n,
    intentosMax: max === Infinity ? null : max,
    layout: config.layout,
    /* Nunca se envía "c" (respuestas correctas). */
    preguntas: a.preguntas.flatMap((i) => {
      const q = preguntas[i];
      return q ? [{ i, t: q.t, q: q.q, o: q.o }] : [];
    }),
    iniciadaEn: new Date(a.iniciadaEn!).toISOString(),
    venceEn: a.venceEn === null ? null : new Date(a.venceEn).toISOString(),
  };
};

export const examStatus = (r: CourseRef, u: string): ExamStatus => {
  const s = r.course.slug;
  expireStale(u, s);
  const { config, preguntas } = examOf(r);
  const list = attemptsOf(u, s);
  const max = maxFor(r, u);
  const used = list.length;
  const passed = isPassed(u, s);
  const open = list.find((a) => a.estado === "en_curso");
  const req = db().solicitudes.filter((x) => x.u === u && x.s === s).at(-1);
  const left = attemptsLeft(max, used);
  const base = {
    config,
    preguntas: config.maxPreg ? Math.min(config.maxPreg, preguntas.length) : preguntas.length,
    intentosUsados: used,
    intentosMax: max === Infinity ? null : max,
    intentosRestantes: left === Infinity ? null : left,
    notaFinal: finalNoteOf(r, u),
    aprobado: passed,
    abreEl: "",
    solicitud: req?.estado ?? null,
    sesion: null,
  };
  if (passed) return { ...base, estado: "aprobado", motivo: "Ya aprobaste el examen final" };
  if (open) return { ...base, estado: "en_curso", motivo: "Tienes un intento en curso", sesion: publicSession(r, open, max) };
  if (!lessonsDone(doneOf(u, s), r.course)) return { ...base, estado: "bloqueado", motivo: "Termina todas las lecciones para presentar el examen final" };
  if (config.desbloqueo && hoyIso() < config.desbloqueo)
    return { ...base, estado: "programado", abreEl: config.desbloqueo, motivo: `El examen final se abre el ${isoToMx(config.desbloqueo)}` };
  if (left <= 0) return { ...base, estado: "sin_intentos", motivo: `Usaste ${used} de ${max} intentos. La administración puede autorizar un intento adicional.` };
  return { ...base, estado: "disponible", motivo: "Tu examen final está listo" };
};

export const getExamStatus = async (u: string, slug: string): Promise<ExamStatus> => examStatus(requireAccess(u, slug), u);

const shuffle = <T>(a: T[]): T[] => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j]!, b[i]!];
  }
  return b;
};

export const startExam = async (u: string, slug: string): Promise<ExamSession> => {
  const r = requireAccess(u, slug);
  const st = examStatus(r, u);
  if (st.estado === "en_curso") return st.sesion!;
  if (st.estado !== "disponible") throw conflict(st.motivo, { estado: st.estado });
  const { config, preguntas } = examOf(r);
  if (!preguntas.length) throw conflict("El examen todavía no tiene preguntas");
  let idx = preguntas.map((_, i) => i);
  if (config.orden === "aleatorio") idx = shuffle(idx);
  if (config.maxPreg) idx = idx.slice(0, config.maxPreg);
  const t0 = now().getTime();
  const a: AttemptRecord = {
    id: nextId(db().intentos),
    u,
    s: slug,
    n: st.intentosUsados + 1,
    f: hoyMx(),
    nota: 0,
    ok: false,
    t: 0,
    estado: "en_curso",
    ans: null,
    preguntas: idx,
    sesion: randomUUID(),
    iniciadaEn: t0,
    venceEn: config.tiempo ? t0 + config.tiempo * 60_000 : null,
  };
  db().intentos.push(a);
  return publicSession(r, a, maxFor(r, u));
};

const detailOf = (qs: readonly Question[], ans: { i: number; v: number[]; ok: boolean }[]): AnswerDetail[] =>
  ans.map(({ i, v, ok }) => {
    const q = qs[i];
    if (!q) return { i, q: "Pregunta eliminada del examen", elegidas: [], correctas: [], ok };
    return { i, q: q.q, elegidas: v.map((j) => q.o[j] ?? ""), correctas: q.c.map((j) => q.o[j] ?? ""), ok };
  });

export const submitExam = async (u: string, slug: string, body: ExamSubmitRequest): Promise<ExamResult> => {
  const r = requireAccess(u, slug);
  const a = attemptsOf(u, slug).find((x) => x.sesion === body.sesion);
  if (!a || a.estado !== "en_curso") throw conflict("Este intento ya se cerró o no existe");
  const { config, preguntas } = examOf(r);
  const t = now().getTime();
  if (a.venceEn !== null && t > a.venceEn + EXAM_GRACE_SECONDS * 1000) {
    expireStale(u, slug);
    throw conflict("Se agotó el tiempo del examen. El intento quedó como no aprobado.", { estado: "expirado" });
  }
  /* Validación contra las preguntas que le tocaron: índices conocidos, opciones existentes, una sola en om/vf. */
  const asked = new Set(a.preguntas);
  const given = new Map<number, number[]>();
  for (const { i, v } of body.respuestas) {
    const q = preguntas[i];
    if (!asked.has(i) || !q) throw badRequest("Hay respuestas de preguntas que no forman parte de tu examen");
    const opts = [...new Set(v)];
    if (opts.some((j) => j >= q.o.length) || (q.t !== "rm" && opts.length > 1)) throw badRequest("Hay respuestas con opciones no válidas");
    given.set(i, opts);
  }
  const { nota, ans } = gradeAnswers(
    preguntas,
    a.preguntas.map((i) => ({ i, v: given.get(i) ?? [] })),
  );
  const limit = config.tiempo ? config.tiempo * 60 : Infinity;
  a.estado = "calificado";
  a.nota = nota;
  a.ok = isPassing(nota, config.aprobatoria);
  a.t = Math.max(1, Math.min(limit, Math.round((t - (a.iniciadaEn ?? t)) / 1000)));
  a.f = hoyMx();
  a.ans = ans;
  a.sesion = null;

  let puntos = 0;
  let constancia = null;
  if (a.ok && canIssueCertificate(lessonsDone(doneOf(u, slug), r.course), true) && !certificateFor(u, slug)) {
    const { cert } = issueCertificate(u, r.course.price ? "diplomado" : "curso", slug, r.course.title);
    constancia = summary(cert);
    puntos = awardRule(u, "curso", `Curso terminado: ${r.course.title}`);
  }
  const max = maxFor(r, u);
  const left = attemptsLeft(max, attemptsOf(u, slug).length);
  return {
    intento: { n: a.n, nota: a.nota, ok: a.ok, t: a.t, f: a.f },
    aprobatoria: config.aprobatoria,
    notaFinal: finalNoteOf(r, u) ?? nota,
    calculo: config.calculo,
    intentosRestantes: left === Infinity ? null : left,
    constancia,
    puntos,
    detalle: db().ajustes.ocultar ? null : detailOf(preguntas, ans),
  };
};

/* ---------- Intentos adicionales ---------- */

export const requestExtraAttempt = async (u: string, slug: string): Promise<AttemptRequest> => {
  const r = requireAccess(u, slug);
  const st = examStatus(r, u);
  if (st.estado !== "sin_intentos") throw conflict("Solo puedes pedir un intento adicional cuando agotaste tus intentos");
  if (st.solicitud === "pendiente") throw conflict("Ya enviaste una solicitud; te avisamos cuando la revisen");
  const req: AttemptRequest = { id: nextId(db().solicitudes), u, s: slug, estado: "pendiente", f: hoyMx() };
  db().solicitudes.unshift(req);
  return req;
};

export const listRequests = async (): Promise<AttemptRequestRow[]> => db().solicitudes.map((x) => ({ ...x, titulo: courseTitle(x.s) }));

export const resolveRequest = async (id: number, autorizar: boolean): Promise<AttemptRequestRow> => {
  const req = db().solicitudes.find((x) => x.id === id);
  if (!req) throw notFound("Solicitud no encontrada");
  if (req.estado !== "pendiente") throw conflict("Esta solicitud ya se resolvió");
  req.estado = autorizar ? "autorizado" : "rechazado";
  if (autorizar) db().extra[key(req.u, req.s)] = (db().extra[key(req.u, req.s)] ?? 0) + 1;
  return { ...req, titulo: courseTitle(req.s) };
};

/* ---------- Intentos (administración) ---------- */

const rowOf = (a: AttemptRecord): AttemptRow => ({
  id: a.id,
  u: a.u,
  s: a.s,
  titulo: courseTitle(a.s),
  n: a.n,
  f: a.f,
  nota: a.nota,
  ok: a.ok,
  t: a.t,
  conDetalle: !!a.ans,
});

export interface AttemptFilter {
  curso?: string;
  q?: string;
  rango?: DateRange;
}

export const listAttempts = async (f: AttemptFilter): Promise<AttemptRow[]> => {
  const q = f.q ? normalize(f.q) : "";
  return db()
    .intentos.filter((a) => a.estado !== "en_curso" && (!f.curso || a.s === f.curso) && (!q || normalize(a.u).includes(q)) && inRange(a.f, f.rango ?? ""))
    .sort((a, b) => mxToIso(b.f).localeCompare(mxToIso(a.f)) || b.id - a.id)
    .map(rowOf);
};

/* Detalle con respuestas correctas: solo la administración lo ve. */
export const attemptDetail = async (id: number): Promise<AttemptDetail> => {
  const a = db().intentos.find((x) => x.id === id && x.estado !== "en_curso");
  if (!a) throw notFound("Intento no encontrado");
  const r = getCourse(a.s);
  return { ...rowOf(a), respuestas: a.ans ? detailOf(examOf(r).preguntas, a.ans) : [] };
};
