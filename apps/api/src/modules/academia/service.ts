/* Administración de la academia: ajustes globales, calificaciones, alumnos, grupos, banco, automatizaciones y reportes. */
import {
  daysSince,
  INACTIVE_DAYS,
  inRange,
  isoToMx,
  mxToIso,
  normalize,
  progressPct,
  type AcademyReport,
  type AcademySettings,
  type Automation,
  type AutomationUpdateRequest,
  type BankQuestion,
  type BankQuestionCreateRequest,
  type DateRange,
  type GradebookRow,
  type GradebookState,
  type Group,
  type GroupDetail,
  type HistoryEvent,
  type ImportRequest,
  type ImportResult,
  type ReportKind,
  type StudentOrder,
  type StudentRow,
} from "@kiron/shared";
import { db, nextId } from "../../store";
import { hoyMx, now } from "../../lib/clock";
import { notFound } from "../../lib/http";
import { allCourses, courseTitle, findCourse, getCourse, lessonsOf } from "../cursos/service";
import { attemptsOf, finalNoteOf, isPassed, maxFor } from "../examenes/service";
import { certificateFor } from "../constancias/service";

/* ---------- Ajustes globales ---------- */

export const getSettings = async (): Promise<AcademySettings> => db().ajustes;

export const updateSettings = async (patch: Partial<AcademySettings>): Promise<AcademySettings> => {
  const s = db();
  Object.assign(s.ajustes, patch);
  /* Con "ocultar" activo ningún examen puede revelar respuestas. */
  if (s.ajustes.ocultar) {
    for (const [k, cfg] of Object.entries(s.examenes)) if (cfg.retro === "revelar") s.examenes[k] = { ...cfg, retro: "defecto" };
    for (const e of s.editor) if (e.examen.retro === "revelar") e.examen.retro = "defecto";
  }
  return s.ajustes;
};

/* ---------- Libro de calificaciones ---------- */

const mailOf = (u: string) => db().alumnos.find((a) => a.nombre === u)?.correo ?? "";
const isInactive = (ultimoAcceso: string) => daysSince(ultimoAcceso, now().getTime()) > INACTIVE_DAYS;

const gradebook = (): GradebookRow[] =>
  db()
    .avance.filter((p) => db().inscripciones.some((e) => e.u === p.u && e.s === p.s && e.st === "approved"))
    .flatMap((p) => {
      const r = findCourse(p.s);
      if (!r) return [];
      const passed = isPassed(p.u, p.s);
      const used = attemptsOf(p.u, p.s).length;
      const max = maxFor(r, p.u);
      const estado: GradebookState = passed ? "Aprobado" : isInactive(p.ultimoAcceso) ? "Inactivo" : used >= max ? "Sin intentos" : "En curso";
      return [
        {
          u: p.u,
          correo: mailOf(p.u),
          s: p.s,
          titulo: r.course.title,
          avance: progressPct(Math.min(p.done.length, lessonsOf(r)) + (passed ? 1 : 0), r.course),
          nota: passed ? finalNoteOf(r, p.u) : null,
          intentosUsados: used,
          intentosMax: max === Infinity ? null : max,
          ultimoAcceso: p.ultimoAcceso,
          estado,
        },
      ];
    });

export const listGradebook = async (curso?: string): Promise<GradebookRow[]> => gradebook().filter((r) => !curso || r.s === curso);

export const history = async (u: string, s: string): Promise<HistoryEvent[]> => {
  const r = getCourse(s);
  const e = db().inscripciones.find((x) => x.u === u && x.s === s);
  const p = db().avance.find((x) => x.u === u && x.s === s);
  if (!e && !p) throw notFound("El alumno no tiene historial en este curso");
  const ev: HistoryEvent[] = [];
  if (e) ev.push({ icono: "badge-check", texto: `Inscripción ${({ approved: "aprobada", pending: "pendiente", cancelled: "cancelada" } as const)[e.st]} · ${e.f}` });
  ev.push({ icono: "book-open", texto: `Completó ${p?.done.length ?? 0} de ${lessonsOf(r)} lecciones` });
  for (const a of attemptsOf(u, s))
    ev.push({
      icono: "list-checks",
      texto: a.estado === "en_curso" ? `Examen final · intento ${a.n} · en curso` : `Examen final · intento ${a.n} · ${a.nota.toFixed(1)} · ${a.ok ? "aprobado" : "no aprobado"}`,
    });
  const cert = certificateFor(u, s);
  if (cert) ev.push({ icono: "award", texto: `Constancia emitida · folio ${cert.folio}` });
  if (p) ev.push({ icono: "clock", texto: `Último acceso: ${p.ultimoAcceso}` });
  return ev;
};

/* ---------- Alumnos ---------- */

export interface StudentFilter {
  curso?: string;
  rango?: DateRange;
  orden?: StudentOrder;
  q?: string;
}

const stripTitle = (n: string) => n.replace(/^(MVZ|Dra?\.)\s/, "");

export const listStudents = async (f: StudentFilter): Promise<StudentRow[]> => {
  const s = db();
  const nCur = (u: string) => s.inscripciones.filter((e) => e.u === u && e.st === "approved").length;
  const q = f.q ? normalize(f.q) : "";
  const rows = s.alumnos
    .filter(
      (a) =>
        (!f.curso || s.inscripciones.some((e) => e.u === a.nombre && e.s === f.curso && e.st === "approved")) &&
        (!q || normalize(a.nombre + " " + a.correo).includes(q)) &&
        inRange(a.registro, f.rango ?? ""),
    )
    .map((a) => ({ ...a, cursos: nCur(a.nombre) }));
  const o = f.orden ?? "recientes";
  return rows.sort((a, b) =>
    o === "nombre" ? stripTitle(a.nombre).localeCompare(stripTitle(b.nombre), "es") : o === "cursos" ? b.cursos - a.cursos : mxToIso(b.registro).localeCompare(mxToIso(a.registro)),
  );
};

/* Inscripción masiva: agrega alumnos nuevos (se omiten correos repetidos) y, si se indica, los suma a un grupo. */
export const importStudents = async (body: ImportRequest): Promise<ImportResult> => {
  const s = db();
  const g = body.grupo === undefined ? undefined : s.grupos.find((x) => x.id === body.grupo);
  if (body.grupo !== undefined && !g) throw notFound("Grupo no encontrado");
  const seen = new Set(s.alumnos.map((a) => a.correo.toLowerCase()));
  let agregados = 0;
  for (const a of body.alumnos) {
    const correo = a.correo.toLowerCase();
    if (seen.has(correo)) continue;
    seen.add(correo);
    s.alumnos.push({ nombre: a.nombre, correo, registro: hoyMx() });
    if (g) {
      g.miembros.push(a.nombre);
      g.total += 1;
    }
    agregados++;
  }
  return { agregados, repetidos: body.alumnos.length - agregados };
};

/* ---------- Grupos ---------- */

export const listGroups = async (): Promise<Group[]> => db().grupos;

export const createGroup = async (nombre: string): Promise<Group> => {
  const g: Group = { id: nextId(db().grupos), nombre, total: 0, curso: "", vence: "", avance: 0, miembros: [] };
  db().grupos.push(g);
  return g;
};

export const groupDetail = async (id: number): Promise<GroupDetail> => {
  const g = db().grupos.find((x) => x.id === id);
  if (!g) throw notFound("Grupo no encontrado");
  const rows = gradebook();
  return {
    ...g,
    alumnos: g.miembros.flatMap((u) => {
      const own = rows.filter((r) => r.u === u);
      const r = own.find((x) => x.s === g.curso) ?? own[0];
      return r ? [{ u, s: r.s, titulo: r.titulo, avance: r.avance }] : [{ u, s: "", titulo: "", avance: 0 }];
    }),
  };
};

export const assignGroup = async (id: number, curso: string, venceIso: string): Promise<Group> => {
  const g = db().grupos.find((x) => x.id === id);
  if (!g) throw notFound("Grupo no encontrado");
  if (!findCourse(curso)) throw notFound("Curso no encontrado");
  g.curso = curso;
  g.vence = isoToMx(venceIso);
  return g;
};

/* ---------- Banco de preguntas ---------- */

export const listBank = async (): Promise<BankQuestion[]> => db().banco;

export const addBankQuestion = async (b: BankQuestionCreateRequest): Promise<BankQuestion> => {
  const q: BankQuestion = { id: nextId(db().banco), texto: b.texto, tipo: b.tipo, tema: b.tema, usos: 0 };
  db().banco.unshift(q);
  return q;
};

/* ---------- Automatizaciones ---------- */

export const listAutomations = async (): Promise<Automation[]> => db().automatizaciones;

export const updateAutomation = async (id: number, patch: AutomationUpdateRequest): Promise<Automation> => {
  const a = db().automatizaciones.find((x) => x.id === id);
  if (!a) throw notFound("Automatización no encontrada");
  Object.assign(a, patch);
  return a;
};

/* ---------- Reportes ---------- */

export const report = async (): Promise<AcademyReport> => {
  const g = gradebook();
  const s = db();
  const year = String(now().getFullYear());
  const porCurso = allCourses()
    .map((r) => {
      const slug = r.course.slug;
      const inscritas = s.inscripciones.filter((e) => e.s === slug && e.st === "approved").length;
      const rows = g.filter((x) => x.s === slug);
      const fin = rows.filter((x) => x.estado === "Aprobado" && x.avance >= 100);
      const graded = rows.filter((x) => x.nota !== null);
      return {
        slug,
        titulo: r.course.title,
        inscritas,
        terminaron: fin.length,
        tasa: inscritas ? Math.round((fin.length / inscritas) * 100) : 0,
        promedio: graded.length ? Math.round((graded.reduce((t, x) => t + x.nota!, 0) / graded.length) * 10) / 10 : null,
        constancias: s.constancias.filter((c) => c.ref === slug).length,
      };
    })
    .filter((x) => x.inscritas);
  const tIns = porCurso.reduce((t, x) => t + x.inscritas, 0);
  const tFin = porCurso.reduce((t, x) => t + x.terminaron, 0);
  const grd = g.filter((x) => x.nota !== null);
  const inact = g.filter((x) => isInactive(x.ultimoAcceso)).length;
  const byQ = new Map<string, number[]>();
  for (const a of s.intentos) if (a.estado !== "en_curso") byQ.set(a.s, [...(byQ.get(a.s) ?? []), a.nota]);
  return {
    kpis: {
      tasaFinalizacion: tIns ? Math.round((tFin / tIns) * 100) : 0,
      calificacionPromedio: grd.length ? Math.round((grd.reduce((t, x) => t + x.nota!, 0) / grd.length) * 10) / 10 : null,
      activos: g.length - inact,
      inactivos: inact,
      constancias: s.constancias.length,
    },
    inscripcionesPorMes: Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((mes) => ({
      mes,
      total: s.inscripciones.filter((e) => e.f.slice(3) === `${mes}/${year}`).length,
    })),
    promedioPorExamen: [...byQ].map(([slug, notas]) => ({
      slug,
      titulo: courseTitle(slug),
      intentos: notas.length,
      promedio: Math.round((notas.reduce((x, y) => x + y, 0) / notas.length) * 10) / 10,
    })),
    porCurso,
  };
};

const csvCell = (v: unknown) => {
  const t = String(v ?? "");
  /* Evita inyección de fórmulas al abrir el CSV en Excel. */
  const safe = /^[=+\-@\t\r]/.test(t) ? "'" + t : t;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const reportCsv = async (kind: ReportKind): Promise<string> => {
  const rows = gradebook();
  let head: string[];
  let data: unknown[][];
  if (kind === "curso" || kind === "instructor") {
    const per = allCourses().map((r) => {
      const x = rows.filter((y) => y.s === r.course.slug);
      const a = x.filter((y) => y.nota !== null);
      return { r, x, a, prom: a.length ? (a.reduce((t, y) => t + y.nota!, 0) / a.length).toFixed(1) : "" };
    });
    if (kind === "curso") {
      head = ["Curso", "Inscritos", "Aprobados", "Calificación promedio"];
      data = per.map((p) => [p.r.course.title, p.x.length, p.a.length, p.prom]);
    } else {
      head = ["Instructor", "Curso", "Alumnos", "Calificación promedio"];
      data = per.map((p) => [p.r.editor?.instructor || "[FALTA DATO]", p.r.course.title, p.x.length, p.prom]);
    }
  } else if (kind === "avance") {
    head = ["Alumno", "Curso", "Avance %"];
    data = rows.map((r) => [r.u, r.titulo, r.avance]);
  } else if (kind === "inactividad") {
    head = ["Alumno", "Curso", "Último acceso", "Avance %"];
    data = rows.filter((r) => isInactive(r.ultimoAcceso)).map((r) => [r.u, r.titulo, r.ultimoAcceso, r.avance]);
  } else {
    head = ["Alumno", "Correo", "Curso", "Avance %", "Calificación", "Intentos", "Último acceso", "Estado"];
    data = rows.map((r) => [r.u, r.correo, r.titulo, r.avance, r.nota?.toFixed(1) ?? "", r.intentosUsados, r.ultimoAcceso, r.estado]);
  }
  return "﻿" + [head, ...data].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
};
