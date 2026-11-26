/* Inscripciones: el único control de acceso a un curso. El precio nunca interviene. */
import {
  inRange,
  normalize,
  type AdminEnrollmentList,
  type DateRange,
  type Enrollment,
  type EnrollmentState,
} from "@kiron/shared";
import { db, nextId } from "../../store";
import { hoyMx } from "../../lib/clock";
import { conflict, notFound } from "../../lib/http";
import { courseTitle, findCourse, isVisible } from "../cursos/service";

export const enrollmentOf = (u: string, s: string): Enrollment | undefined => db().inscripciones.find((e) => e.u === u && e.s === s);

export const hasApprovedEnrollment = (u: string, s: string): boolean => enrollmentOf(u, s)?.st === "approved";

/* Crea o actualiza la inscripción de un alumno en un curso (equivale a enrUpsert del demo). */
export const upsertEnrollment = (u: string, s: string, st: EnrollmentState, por: string): Enrollment => {
  const list = db().inscripciones;
  let e = enrollmentOf(u, s);
  if (!e) {
    e = { id: nextId(list), u, s, st, f: hoyMx(), por };
    list.unshift(e);
  } else {
    e.st = st;
    e.por = por;
    if (st !== "cancelled") e.f = hoyMx();
  }
  if (st === "approved" && !db().avance.some((a) => a.u === u && a.s === s))
    db().avance.push({ u, s, done: [], visto: {}, ultimoAcceso: hoyMx() });
  return e;
};

export const myEnrollments = async (u: string): Promise<Enrollment[]> => db().inscripciones.filter((e) => e.u === u);

/* Curso gratuito: queda aprobada. Curso con precio: solicitud pendiente que aprueba el equipo (no hay cobro). */
export const requestEnrollment = async (u: string, slug: string): Promise<Enrollment> => {
  const r = findCourse(slug);
  if (!r || !isVisible(r)) throw notFound("Curso no encontrado");
  const e = enrollmentOf(u, slug);
  if (e?.st === "approved") throw conflict("Ya estás inscrito en este curso");
  if (e?.st === "pending") throw conflict("Tu solicitud ya está en revisión");
  return r.course.price ? upsertEnrollment(u, slug, "pending", "Solicitud del médico") : upsertEnrollment(u, slug, "approved", "Inscripción en línea");
};

const mailOf = (u: string) => db().alumnos.find((a) => a.nombre === u)?.correo ?? "";

export interface EnrollmentFilter {
  curso?: string;
  estado?: EnrollmentState;
  q?: string;
  rango?: DateRange;
}

export const adminEnrollments = async (f: EnrollmentFilter): Promise<AdminEnrollmentList> => {
  const all = db().inscripciones;
  const q = f.q ? normalize(f.q) : "";
  const items = all
    .filter((e) => (!f.curso || e.s === f.curso) && (!f.estado || e.st === f.estado) && (!q || normalize(e.u + " " + mailOf(e.u)).includes(q)) && inRange(e.f, f.rango ?? ""))
    .map((e) => ({ ...e, correo: mailOf(e.u), titulo: courseTitle(e.s) }));
  const cnt = (k: EnrollmentState) => all.filter((e) => e.st === k).length;
  return { items, conteo: { approved: cnt("approved"), pending: cnt("pending"), cancelled: cnt("cancelled") } };
};

export const adminEnroll = async (slug: string, correos: string[]): Promise<{ inscritas: Enrollment[] }> => {
  if (!findCourse(slug)) throw notFound("Curso no encontrado");
  const alumnos = [...new Set(correos.map((c) => c.toLowerCase()))].map((c) => db().alumnos.find((a) => a.correo.toLowerCase() === c));
  if (alumnos.some((a) => !a)) throw notFound("Alguno de los correos no corresponde a un alumno registrado");
  return { inscritas: alumnos.map((a) => upsertEnrollment(a!.nombre, slug, "approved", "Equipo Kirón")) };
};

export const setEnrollmentState = async (id: number, st: EnrollmentState): Promise<Enrollment> => {
  const e = db().inscripciones.find((x) => x.id === id);
  if (!e) throw notFound("Inscripción no encontrada");
  return upsertEnrollment(e.u, e.s, st, "Equipo Kirón");
};

export const bulkEnrollmentState = async (ids: number[], st: EnrollmentState): Promise<{ actualizadas: number }> => {
  const set = new Set(ids);
  const rows = db().inscripciones.filter((e) => set.has(e.id) && e.st !== st);
  rows.forEach((e) => upsertEnrollment(e.u, e.s, st, "Equipo Kirón"));
  return { actualizadas: rows.length };
};
