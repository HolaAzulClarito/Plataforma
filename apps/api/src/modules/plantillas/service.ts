/* Plantillas de constancia: imagen base del equipo de diseño + variables posicionadas (porcentaje x/y y tamaño). */
import type { CertTemplate, CertTemplateDetail, CertTemplateSummary, CertTemplateUpdateRequest, CertVar, CertVarKey } from "@kiron/shared";
import { db } from "../../store";
import { notFound } from "../../lib/http";
import { findCourse } from "../cursos/service";

export const CERT_VAR_KEYS: readonly CertVarKey[] = ["nombre", "curso", "fecha", "folio", "qr"];

const defaultVars = (): Record<CertVarKey, CertVar> => ({
  nombre: { x: 50, y: 41.5, size: 40, on: true },
  curso: { x: 50, y: 58, size: 19, on: true },
  fecha: { x: 22, y: 84, size: 13, on: true },
  folio: { x: 50, y: 84, size: 13, on: true },
  qr: { x: 85, y: 81, size: 84, on: true },
});

const summaryOf = (t: CertTemplate): CertTemplateSummary => ({ ...t, tieneImagen: !!db().imagenes[t.id] });

const templateOf = (id: string): CertTemplate => {
  const t = db().plantillas.find((x) => x.id === id);
  if (!t) throw notFound("Plantilla no encontrada");
  return t;
};

/* Límites de posición del editor visual del demo. */
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const sizeRange = (k: CertVarKey): [number, number] => (k === "qr" ? [50, 160] : [9, 72]);

export const listTemplates = async (): Promise<CertTemplateSummary[]> => db().plantillas.map(summaryOf);

export const getTemplate = async (id: string): Promise<CertTemplateDetail> => {
  const t = templateOf(id);
  return { ...t, imagen: db().imagenes[t.id] ?? null };
};

export const createTemplate = async (nombre?: string): Promise<CertTemplateSummary> => {
  const s = db();
  const n = s.plantillas.reduce((m, t) => Math.max(m, Number(/^c(\d+)$/.exec(t.id)?.[1] ?? 0)), 0) + 1;
  const t: CertTemplate = { id: `c${n}`, nombre: nombre || "Nueva plantilla", estado: "draft", cursos: [], vars: defaultVars() };
  s.plantillas.push(t);
  return summaryOf(t);
};

export const updateTemplate = async (id: string, b: CertTemplateUpdateRequest): Promise<CertTemplateSummary> => {
  const t = templateOf(id);
  if (b.nombre !== undefined) t.nombre = b.nombre;
  if (b.estado !== undefined) t.estado = b.estado;
  if (b.cursos !== undefined) {
    const cursos = [...new Set(b.cursos)];
    if (cursos.some((s) => !findCourse(s))) throw notFound("Alguno de los cursos no existe");
    /* Un curso usa una sola plantilla: asociarlo aquí lo quita de las demás. */
    for (const o of db().plantillas) if (o.id !== t.id) o.cursos = o.cursos.filter((s) => !cursos.includes(s));
    t.cursos = cursos;
  }
  if (b.vars)
    for (const k of CERT_VAR_KEYS) {
      const p = b.vars[k];
      if (!p) continue;
      const cur = t.vars[k];
      const [lo, hi] = sizeRange(k);
      t.vars[k] = {
        x: p.x === undefined ? cur.x : clamp(Math.round(p.x * 10) / 10, 2, 98),
        y: p.y === undefined ? cur.y : clamp(Math.round(p.y * 10) / 10, 3, 97),
        size: p.size === undefined ? cur.size : clamp(Math.round(p.size), lo, hi),
        on: p.on ?? cur.on,
      };
    }
  return summaryOf(t);
};

export const setTemplateImage = async (id: string, imagen: string | null): Promise<CertTemplateSummary> => {
  const t = templateOf(id);
  if (imagen) db().imagenes[t.id] = imagen;
  else delete db().imagenes[t.id];
  return summaryOf(t);
};
