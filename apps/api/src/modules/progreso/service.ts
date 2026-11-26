/* Avance por lección. La lección se completa sola cuando el reproductor reporta el 100 %; no hay marcado manual.
   El alumno ve las lecciones en el orden que quiera; solo el desbloqueo por fecha bloquea una lección. */
import { canIssueCertificate, lessonsDone, nextLesson, progressPct, type CourseProgress, type LessonProgressResult, type MyCoursesResponse } from "@kiron/shared";
import { db, type ProgressRecord } from "../../store";
import { hoyMx } from "../../lib/clock";
import { conflict, notFound } from "../../lib/http";
import { allCourses, isVisible, lessonInfo, lessonLockedUntil, lessonsOf, modulesOf, type CourseRef } from "../cursos/service";
import { hasApprovedEnrollment } from "../inscripciones/service";
import { awardRule } from "../club/service";
import { certificateFor, issueCertificate, summary } from "../constancias/service";
import { examStatus, isPassed, requireAccess } from "../examenes/service";

const recordOf = (u: string, s: string): ProgressRecord => {
  let p = db().avance.find((a) => a.u === u && a.s === s);
  if (!p) {
    p = { u, s, done: [], visto: {}, ultimoAcceso: hoyMx() };
    db().avance.push(p);
  }
  return p;
};

const progressOf = (r: CourseRef, u: string): CourseProgress => {
  const s = r.course.slug;
  const p = recordOf(u, s);
  const ex = examStatus(r, u);
  const cert = certificateFor(u, s);
  return {
    slug: s,
    lecciones: lessonInfo(r).map((l) => ({ ...l, hecha: p.done.includes(l.i), visto: p.visto[l.i] ?? 0 })),
    modulos: modulesOf(r),
    hechas: p.done.length,
    total: lessonsOf(r),
    siguiente: nextLesson(r.course, p.done, (i) => !!lessonLockedUntil(r, i)),
    pct: progressPct(p.done.length + (ex.aprobado ? 1 : 0), r.course),
    examen: ex,
    constancia: cert ? summary(cert) : null,
  };
};

export const getProgress = async (u: string, slug: string): Promise<CourseProgress> => progressOf(requireAccess(u, slug), u);

export const reportLesson = async (u: string, slug: string, i: number, pct: number): Promise<LessonProgressResult> => {
  const r = requireAccess(u, slug);
  if (i >= lessonsOf(r)) throw notFound("Lección no encontrada");
  const lock = lessonLockedUntil(r, i);
  if (lock) throw conflict("Esta lección todavía no se abre", { bloqueadaHasta: lock });
  const p = recordOf(u, slug);
  p.ultimoAcceso = hoyMx();
  p.visto[i] = Math.max(p.visto[i] ?? 0, pct);
  let nueva = false;
  let puntos = 0;
  if (pct >= 100 && !p.done.includes(i)) {
    p.done.push(i);
    p.done.sort((a, b) => a - b);
    nueva = true;
    puntos = awardRule(u, "leccion", `Lección completada: ${r.course.title}`);
    /* Si el examen ya estaba aprobado (p. ej. se agregó una lección después), la constancia sale al completar la última. */
    if (canIssueCertificate(lessonsDone(p.done, r.course), isPassed(u, slug)) && !certificateFor(u, slug)) {
      issueCertificate(u, r.course.price ? "diplomado" : "curso", slug, r.course.title);
      puntos += awardRule(u, "curso", `Curso terminado: ${r.course.title}`);
    }
  }
  return { completada: p.done.includes(i), nueva, puntos, progreso: progressOf(r, u) };
};

export const myCourses = async (u: string): Promise<MyCoursesResponse> => {
  const cursos = allCourses()
    .filter((r) => isVisible(r) && hasApprovedEnrollment(u, r.course.slug))
    .map((r) => {
      const p = recordOf(u, r.course.slug);
      const ex = examStatus(r, u);
      return {
        course: r.course,
        hechas: p.done.length,
        total: lessonsOf(r),
        pct: progressPct(p.done.length + (ex.aprobado ? 1 : 0), r.course),
        intentosUsados: ex.intentosUsados,
        intentosMax: ex.intentosMax,
        notaFinal: ex.notaFinal,
        examen: ex.estado,
        constancia: certificateFor(u, r.course.slug)?.folio ?? null,
      };
    });
  return { cursos, solicitudes: db().inscripciones.filter((e) => e.u === u && e.st === "pending") };
};
