/* Datos con la forma del contrato y un mock de la API con estado para los tests del administrador.
   Usa mockFetch() de test/utils; cada ruta puede ser un valor fijo o una función (método, cuerpo) -> respuesta. */
import {
  editorIssues,
  EXAM_DEFAULTS,
  type AcademySettings,
  type AdminCourseList,
  type AdminEnrollmentList,
  type AttemptRequestRow,
  type CedulaVerification,
  type ClubReward,
  type ClubRule,
  type Dashboard,
  type EditorCourse,
  type EditorCourseCreateRequest,
  type EditorCourseDetail,
  type EditorQuestion,
} from "@kiron/shared";
import { CATALOG } from "../../test/fixtures";
import { mockFetch, type FetchCall } from "../../test/utils";

export type Handler = (method: string, body: unknown) => unknown;

export function mockAdmin(defs: Record<string, Handler | unknown>): FetchCall[] {
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

/* Cuerpos enviados con un método a una ruta exacta. */
export const sent = (calls: FetchCall[], method: string, path: string) =>
  calls.filter((c) => (c.init?.method ?? "GET") === method && c.url === path).map((c) => (c.init?.body ? (JSON.parse(String(c.init.body)) as unknown) : undefined));

export const DASHBOARD: Dashboard = {
  ejemplo: true,
  kpis: [
    { nombre: "Médicos activos esta semana", valor: "412", tendencia: "+18%" },
    { nombre: "Constancias emitidas", valor: "214", tendencia: "+9%" },
  ],
  asistentesPorMes: [
    { mes: "Sep", asistentes: 301 },
    { mes: "Oct", asistentes: 342 },
  ],
  cedulasPendientes: 1,
  inscripcionesPendientes: 1,
};

export const verifs = (): CedulaVerification[] => [
  { id: 1, nombre: "Dr. Andrés Salinas", cedula: "1234•••", verificado: false },
  { id: 2, nombre: "MVZ Paola Ruiz", cedula: "9876•••", verificado: true },
];

export const COURSE_LIST: AdminCourseList = {
  items: [
    { key: "s:oftalmologia", slug: "oftalmologia", titulo: "Bloque 1 · Oftalmología y otitis", autor: "", cat: "Diplomado Integral", temas: 4, lecciones: 31, regular: 4999, oferta: 2999, fecha: "01/03/2026", estado: "publicado", fechaProg: "", nuevo: false },
    { key: "s:odontologia", slug: "odontologia", titulo: "Temas selectos de odontología", autor: "", cat: "Odontología", temas: 4, lecciones: 16, regular: 0, oferta: 0, fecha: "01/04/2026", estado: "publicado", fechaProg: "", nuevo: false },
  ],
  conteo: { todos: 2, publicado: 2, borrador: 0, programado: 0, privado: 0, papelera: 0 },
};

export const enrollments = (): AdminEnrollmentList => ({
  items: [
    { id: 7, u: "Dr. Andrés Salinas", s: "oftalmologia", st: "pending", f: "10/11/2026", por: "Solicitud del médico", correo: "andres.salinas@correo-ejemplo.mx", titulo: "Bloque 1 · Oftalmología y otitis" },
    { id: 8, u: "MVZ Paola Ruiz", s: "odontologia", st: "approved", f: "02/11/2026", por: "Equipo Kirón", correo: "paola.ruiz@correo-ejemplo.mx", titulo: "Temas selectos de odontología" },
  ],
  conteo: { approved: 1, pending: 1, cancelled: 0 },
});

export const requests = (): AttemptRequestRow[] => [{ id: 3, u: "Dr. Andrés Salinas", s: "oftalmologia", estado: "pendiente", f: "10/11/2026", titulo: "Bloque 1 · Oftalmología y otitis" }];

export const SETTINGS: AcademySettings = { enfoque: false, resumen: true, adminSinInsc: true, login: false, expira: false, pct: 100, ocultar: true };

export const RULES: ClubRule[] = [
  { id: "cedula", nombre: "Cédula verificada", puntos: 200, frecuencia: "Una vez" },
  { id: "leccion", nombre: "Lección completada", puntos: 20, frecuencia: "Por lección" },
];

export const rewards = (): ClubReward[] => [{ id: "kit-clinico", nombre: "Kit clínico de muestras", puntos: 1500, icono: "gift" }];

/* Mini servidor del editor: crear, editar lección, agregar y guardar preguntas, publicar. */
export function editorServer(id = "abc123") {
  let c: EditorCourse | null = null;
  const detail = (): EditorCourseDetail => ({ curso: c!, pendientes: editorIssues(c!) });
  const blank = (tipo: EditorQuestion["tipo"]): EditorQuestion => ({
    tipo,
    texto: "",
    puntos: 1,
    requerida: true,
    mezclar: false,
    explicacion: "",
    opciones: tipo === "om" || tipo === "rm" ? ["", "", "", ""] : [],
    correctas: tipo === "om" || tipo === "vf" ? [0] : [],
    pares: [],
    modelo: "",
  });
  const base = `/api/admin/editor/cursos/${id}`;
  const routes: Record<string, Handler> = {
    "/api/admin/editor/cursos": (_m, b) => {
      const r = b as EditorCourseCreateRequest;
      c = {
        id,
        slug: "curso-nuevo",
        titulo: r.titulo,
        tituloEn: r.tituloEn,
        tipo: r.tipo,
        categoria: r.categoria,
        instructor: r.instructor,
        nivel: r.nivel,
        precioRegular: r.precioRegular,
        precio: r.precio,
        estado: "borrador",
        fecha: "26/11/2026",
        fechaProg: "",
        descripcion: "",
        portada: null,
        modulos: r.modulos.map((m) => ({ nombre: m.nombre, lecciones: Array.from({ length: m.lecciones }, (_, k) => ({ titulo: `Lección ${k + 1}`, video: { lib: "", vid: "" }, dur: "", adjuntos: [], desbloqueo: "" })) })),
        examen: { ...EXAM_DEFAULTS, titulo: "Examen final", preguntas: [] },
      };
      return detail();
    },
    [base]: () => detail(),
    [`${base}/modulos/0/lecciones/0`]: (_m, b) => {
      const x = b as { video?: string; dur?: string; titulo?: string };
      const l = c!.modulos[0]!.lecciones[0]!;
      if (x.video) {
        const m = /(\d+)\/([0-9a-f-]{36})/.exec(x.video);
        if (m) l.video = { lib: m[1]!, vid: m[2]! };
      }
      if (x.dur !== undefined) l.dur = x.dur;
      if (x.titulo) l.titulo = x.titulo;
      return detail();
    },
    [`${base}/examen/preguntas`]: (_m, b) => {
      c!.examen.preguntas.push(blank((b as { tipo: EditorQuestion["tipo"] }).tipo));
      return detail();
    },
    [`${base}/examen/preguntas/0`]: (_m, b) => {
      c!.examen.preguntas[0] = b as EditorQuestion;
      return detail();
    },
    [`${base}/publicar`]: () => {
      c!.estado = "publicado";
      return detail();
    },
  };
  return { routes, get: () => c };
}
