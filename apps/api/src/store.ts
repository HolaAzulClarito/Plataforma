/* Store en memoria de la etapa 1 (ADR-003). Se carga de los JSON semilla al arrancar y se restaura con resetStore().
   Los servicios solo leen y escriben a través de db(); al pasar a Drizzle/PostgreSQL se reemplaza este archivo y el
   interior de los servicios, sin tocar rutas, contrato ni frontend. */
import type {
  AcademySettings,
  AnswerResult,
  AttemptRequest,
  Automation,
  BankQuestion,
  CedulaVerification,
  Certificate,
  CertTemplate,
  ClubReward,
  ClubRule,
  CountriesResponse,
  Course,
  CourseState,
  Distributor,
  DripRule,
  EditorCourse,
  Enrollment,
  ExamConfig,
  Group,
  NextWebinar,
  PointsMovement,
  Product,
  Question,
  RepsResponse,
  SitePage,
  Student,
  Video,
  WebinarHistoryRow,
  WebinarMode,
} from "@kiron/shared";

import categorias from "./data/real/categorias.json" with { type: "json" };
import productos from "./data/real/productos.json" with { type: "json" };
import cursos from "./data/real/cursos.json" with { type: "json" };
import webinar from "./data/real/webinar.json" with { type: "json" };
import paises from "./data/real/paises.json" with { type: "json" };
import representantes from "./data/real/representantes.json" with { type: "json" };
import videos from "./data/real/videos.json" with { type: "json" };

import academia from "./data/ejemplo/academia.json" with { type: "json" };
import alumnos from "./data/ejemplo/alumnos.json" with { type: "json" };
import automatizaciones from "./data/ejemplo/automatizaciones.json" with { type: "json" };
import avance from "./data/ejemplo/avance.json" with { type: "json" };
import banco from "./data/ejemplo/banco.json" with { type: "json" };
import constancias from "./data/ejemplo/constancias.json" with { type: "json" };
import distribuidores from "./data/ejemplo/distribuidores.json" with { type: "json" };
import examenEjemplo from "./data/ejemplo/examen-ejemplo.json" with { type: "json" };
import grupos from "./data/ejemplo/grupos.json" with { type: "json" };
import inscripciones from "./data/ejemplo/inscripciones.json" with { type: "json" };
import intentos from "./data/ejemplo/intentos.json" with { type: "json" };
import medicoDemo from "./data/ejemplo/medico-demo.json" with { type: "json" };
import paginas from "./data/ejemplo/paginas.json" with { type: "json" };
import plantillas from "./data/ejemplo/plantillas.json" with { type: "json" };
import premios from "./data/ejemplo/premios.json" with { type: "json" };
import reglas from "./data/ejemplo/reglas.json" with { type: "json" };
import solicitudes from "./data/ejemplo/solicitudes.json" with { type: "json" };
import tablero from "./data/ejemplo/tablero.json" with { type: "json" };
import verificaciones from "./data/ejemplo/verificaciones.json" with { type: "json" };
import webinarsHistorial from "./data/ejemplo/webinars-historial.json" with { type: "json" };

/* Avance de un alumno en un curso. */
export interface ProgressRecord {
  u: string;
  s: string;
  /* Índices de lecciones completadas (video al 100 %). */
  done: number[];
  /* Porcentaje máximo visto por lección. */
  visto: Record<number, number>;
  ultimoAcceso: string;
}

export type AttemptStatus = "en_curso" | "calificado" | "expirado";

/* Intento del examen final. Se crea al iniciar (cuenta como intento) y se cierra al enviar o al vencer. */
export interface AttemptRecord {
  id: number;
  u: string;
  s: string;
  n: number;
  f: string;
  nota: number;
  ok: boolean;
  /* Segundos usados. */
  t: number;
  estado: AttemptStatus;
  /* Respuestas calificadas; null en intentos migrados de ejemplo. */
  ans: AnswerResult[] | null;
  /* Índices de las preguntas que le tocaron, en el orden mostrado. */
  preguntas: number[];
  sesion: string | null;
  /* Milisegundos epoch. */
  iniciadaEn: number | null;
  venceEn: number | null;
}

export interface StoredWebinar {
  slug: string;
  titulo: string;
  subtitulo: string;
  tituloEn: string;
  subtituloEn: string;
  grado: string;
  ponente: string;
  fecha: string;
  hora: string;
  duracion: number;
  umbral: number;
  publicado: boolean;
  modo: WebinarMode;
  youtube: string;
  flyer: string | null;
  clave: string;
}

export interface WebinarHistory extends WebinarHistoryRow {
  nombres: string[];
}

export interface DemoState {
  /* Reales */
  categorias: string[];
  productos: Product[];
  cursos: Course[];
  webinar: NextWebinar;
  paises: CountriesResponse;
  representantes: RepsResponse;
  videos: Video[];
  /* De ejemplo */
  distribuidores: Distributor[];
  alumnos: Student[];
  inscripciones: Enrollment[];
  avance: ProgressRecord[];
  intentos: AttemptRecord[];
  solicitudes: AttemptRequest[];
  /* Intentos adicionales autorizados: "alumno|slug" -> n. */
  extra: Record<string, number>;
  grupos: Group[];
  banco: BankQuestion[];
  verificaciones: CedulaVerification[];
  paginas: SitePage[];
  reglas: ClubRule[];
  premios: ClubReward[];
  plantillas: CertTemplate[];
  /* Imagen base de cada plantilla (data URL). */
  imagenes: Record<string, string>;
  automatizaciones: Automation[];
  constancias: Certificate[];
  /* Copia de la plantilla e imagen con que se emitió cada constancia (folio -> copia). */
  copias: Record<string, { plantilla: CertTemplate; imagen: string | null }>;
  examenEjemplo: Question[];
  ajustes: AcademySettings;
  /* Reglas del examen por curso del catálogo (las del editor viven en el propio curso). */
  examenes: Record<string, Partial<ExamConfig>>;
  drip: Record<string, DripRule>;
  /* Estado de publicación de los cursos del catálogo. */
  estados: Record<string, { estado: CourseState; fecha: string }>;
  editor: EditorCourse[];
  webinarsNuevos: StoredWebinar[];
  historial: WebinarHistory[];
  registros: { u: string; slug: string }[];
  asistencias: { u: string; slug: string }[];
  puntos: Record<string, number>;
  movimientos: (PointsMovement & { u: string })[];
  canjeados: { u: string; premio: string }[];
  tablero: { kpis: { nombre: string; valor: string; tendencia: string }[]; asistentesPorMes: { mes: string; asistentes: number }[] };
}

const clone = <T>(x: unknown): T => structuredClone(x) as T;

const buildState = (): DemoState => {
  const medico = clone<{ puntos: Record<string, number>; canjeados: string[]; webinarsRegistrados: string[]; webinarsAsistidos: string[] }>(medicoDemo);
  return {
    categorias: clone(categorias),
    productos: clone(productos),
    cursos: clone(cursos),
    webinar: clone(webinar),
    paises: clone(paises),
    representantes: clone(representantes),
    videos: clone(videos),
    distribuidores: clone(distribuidores),
    alumnos: clone(alumnos),
    inscripciones: clone(inscripciones),
    avance: clone<{ u: string; s: string; lecciones: number; ultimoAcceso: string }[]>(avance).map((a) => ({
      u: a.u,
      s: a.s,
      done: Array.from({ length: a.lecciones }, (_, i) => i),
      visto: Object.fromEntries(Array.from({ length: a.lecciones }, (_, i) => [i, 100])),
      ultimoAcceso: a.ultimoAcceso,
    })),
    intentos: clone<Omit<AttemptRecord, "estado" | "ans" | "preguntas" | "sesion" | "iniciadaEn" | "venceEn">[]>(intentos).map((a) => ({
      ...a,
      estado: "calificado",
      ans: null,
      preguntas: [],
      sesion: null,
      iniciadaEn: null,
      venceEn: null,
    })),
    solicitudes: clone(solicitudes),
    extra: clone(academia.extra),
    grupos: clone(grupos),
    banco: clone(banco),
    verificaciones: clone(verificaciones),
    paginas: clone(paginas),
    reglas: clone(reglas),
    premios: clone(premios),
    plantillas: clone(plantillas),
    imagenes: {},
    automatizaciones: clone(automatizaciones),
    constancias: clone(constancias),
    copias: {},
    examenEjemplo: clone(examenEjemplo),
    ajustes: clone(academia.ajustes),
    examenes: clone(academia.examenes),
    drip: clone(academia.drip),
    estados: {},
    editor: [],
    webinarsNuevos: [],
    historial: clone(webinarsHistorial),
    registros: medico.webinarsRegistrados.map((slug) => ({ u: Object.keys(medico.puntos)[0]!, slug })),
    asistencias: medico.webinarsAsistidos.map((slug) => ({ u: Object.keys(medico.puntos)[0]!, slug })),
    puntos: medico.puntos,
    movimientos: [],
    canjeados: [],
    tablero: clone(tablero),
  };
};

let state: DemoState = buildState();

export const db = (): DemoState => state;

export const resetStore = (): void => {
  state = buildState();
};

/* Siguiente id numérico de una colección. */
export const nextId = (rows: readonly { id: number }[]): number => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
