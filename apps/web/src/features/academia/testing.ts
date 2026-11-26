/* Datos con la forma del contrato y un mock de la API con estado para los tests de academia, panel y webinars.
   Usa mockFetch() de test/utils: cada ruta se define con una función que recibe el método y el cuerpo de la llamada. */
import {
  EXAM_DEFAULTS,
  type CourseDetail,
  type CourseProgress,
  type Enrollment,
  type ExamStatus,
  type LessonState,
} from "@kiron/shared";
import { CATALOG, COURSES } from "../../test/fixtures";
import { mockFetch, type FetchCall } from "../../test/utils";

export type Handler = (method: string, body: unknown) => unknown;

/* Rutas del catálogo + handlers dinámicos. Devuelve las llamadas hechas (url, init). */
export function mockApi(defs: Record<string, Handler | unknown>): FetchCall[] {
  const routes: Record<string, unknown> = { ...CATALOG };
  let calls: FetchCall[] = [];
  for (const [path, def] of Object.entries(defs)) {
    if (typeof def !== "function") {
      routes[path] = def;
      continue;
    }
    Object.defineProperty(routes, path, {
      enumerable: true,
      get: () => {
        const c = calls[calls.length - 1];
        const body = c?.init?.body ? (JSON.parse(String(c.init.body)) as unknown) : undefined;
        return (def as Handler)(c?.init?.method ?? "GET", body);
      },
    });
  }
  calls = mockFetch(routes);
  return calls;
}

export const posts = (calls: FetchCall[], path: string) =>
  calls.filter((c) => c.init?.method === "POST" && c.url === path).map((c) => (c.init?.body ? (JSON.parse(String(c.init.body)) as unknown) : undefined));

export const FREE = COURSES[1]!; // odontologia, gratis
export const PAID = COURSES[0]!; // oftalmologia, con precio

export const detailOf = (c = FREE, lessons = 2): CourseDetail => ({
  course: { ...c, lessons: lessons + 1 },
  estado: "publicado",
  tipo: c.price ? "Diplomado" : "Curso",
  origen: "catalogo",
  modulos: [{ k: 1, from: 0, to: lessons - 1 }],
  temario: Array.from({ length: lessons }, (_, i) => ({ i, modulo: 1, titulo: `Lección ${String(i + 1).padStart(2, "0")}`, duracion: "8:00", bloqueadaHasta: "" })),
  instructor: "",
  descripcion: "",
  examen: { preguntas: 2, aprobatoria: 80, intentos: 3, tiempo: 0, desbloqueo: "" },
  constancia: true,
  ajustes: { enfoque: false },
});

export const enrollment = (s: string, st: Enrollment["st"]): Enrollment => ({ id: 9, u: "Dra. Laura Méndez", s, st, f: "26/11/2026", por: "Inscripción en línea" });

export const examStatus = (over: Partial<ExamStatus> = {}): ExamStatus => ({
  estado: "bloqueado",
  motivo: "",
  config: { ...EXAM_DEFAULTS, aprobatoria: 80, intentos: 3, tiempo: 0, layout: "todas" },
  preguntas: 2,
  intentosUsados: 0,
  intentosMax: 3,
  intentosRestantes: 3,
  notaFinal: null,
  aprobado: false,
  abreEl: "",
  solicitud: null,
  puedeSolicitar: false,
  sesion: null,
  ...over,
});

export const progressOf = (slug: string, done: number[], total = 2, examen: ExamStatus = examStatus()): CourseProgress => {
  const lecciones: LessonState[] = Array.from({ length: total }, (_, i) => ({
    i,
    modulo: 1,
    titulo: `Lección ${String(i + 1).padStart(2, "0")}`,
    duracion: "8:00",
    bloqueadaHasta: "",
    hecha: done.includes(i),
    visto: done.includes(i) ? 100 : 0,
  }));
  const next = lecciones.find((l) => !l.hecha)?.i ?? -1;
  return {
    slug,
    lecciones,
    modulos: [{ k: 1, from: 0, to: total - 1 }],
    hechas: done.length,
    total,
    siguiente: next,
    pct: Math.round((done.length / (total + 1)) * 100),
    examen,
    constancia: null,
  };
};
