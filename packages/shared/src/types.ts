/* Tipos de dominio de la plataforma Kirón. Fuente de verdad para web y api. */

export type Lang = "es" | "en";
export type Role = "mvz" | "admin";

/* ---------- Catálogo ---------- */
export interface Product {
  name: string;
  slug: string;
  cat: string;
  img: string;
  isNew?: boolean;
  featured?: boolean;
  /* Ficha estructurada: solo algunos productos la tienen. */
  active?: string;
  form?: string;
  species?: string[];
  pres?: string;
  via?: string;
  reg?: string;
  desc?: string;
  related?: string[];
  indications?: string[];
}

/* ---------- Academia ---------- */
export type CourseTone = "a" | "b" | "c" | "d" | "e" | "f";

export interface Course {
  slug: string;
  title: string;
  cat: string;
  /* Número de lecciones + 1 (el último elemento es el examen final). */
  lessons: number;
  rating: number;
  reviews: number;
  /* Precio informativo en MXN. Nunca dispara un cobro: el acceso lo da la inscripción aprobada. */
  price: number;
  was?: number;
  tone: CourseTone;
  img?: string;
}

export type CourseState = "publicado" | "borrador" | "programado" | "privado" | "papelera";

export interface CourseModule {
  k: number;
  /* Índices de lección, inclusivos. */
  from: number;
  to: number;
}

export type EnrollmentState = "approved" | "pending" | "cancelled";

export interface Enrollment {
  id: number;
  /* Nombre del alumno (demo). En producción será un id de usuario. */
  u: string;
  /* Slug del curso. */
  s: string;
  st: EnrollmentState;
  /* Fecha DD/MM/AAAA. */
  f: string;
  por: string;
}

export type GradeCalc = "mas_alta" | "promedio" | "primer_intento" | "ultimo_intento";
export type ExamLayout = "una" | "todas";
export type ExamOrder = "aleatorio" | "fijo";
export type ExamFeedback = "defecto" | "revelar" | "reintentar";

export interface ExamConfig {
  /* Porcentaje mínimo para aprobar (0-100). */
  aprobatoria: number;
  /* 0 = sin límite. */
  intentos: number;
  /* Minutos; 0 = sin límite. */
  tiempo: number;
  /* 0 = todas las preguntas. */
  maxPreg: number;
  /* Fecha ISO AAAA-MM-DD; vacío = sin restricción. */
  desbloqueo: string;
  layout: ExamLayout;
  orden: ExamOrder;
  lcAbierta: number;
  retro: ExamFeedback;
  calculo: GradeCalc;
}

export type QuestionType = "om" | "vf" | "rm";

export interface Question {
  t: QuestionType;
  q: string;
  o: string[];
  /* Índices de las opciones correctas. */
  c: number[];
}

export interface AnswerResult {
  i: number;
  v: number[];
  ok: boolean;
}

export interface ExamAttempt {
  n: number;
  /* Calificación 0-10 con un decimal. */
  nota: number;
  ok: boolean;
  /* Segundos usados. */
  t: number;
  /* Fecha DD/MM/AAAA. */
  f: string;
  ans: AnswerResult[];
}

export interface CertVar {
  x: number;
  y: number;
  size: number;
  on: boolean;
}

export type CertVarKey = "nombre" | "curso" | "fecha" | "folio" | "qr";

export interface CertTemplate {
  id: string;
  nombre: string;
  estado: "published" | "draft";
  cursos: string[];
  vars: Record<CertVarKey, CertVar>;
}

/* ---------- Webinars ---------- */
export interface NextWebinar {
  /* Fecha ISO AAAA-MM-DD. */
  date: string;
  /* Inicio con zona horaria, ISO 8601. */
  startsAt: string;
  dow: string;
  day: string;
  month: string;
  year: string;
  time: string;
  title: string;
  sub: string;
  deg: string;
  speaker: string;
  img: string;
}

export interface Webinars {
  next: NextWebinar;
  past: unknown[];
}

/* ---------- Red comercial ---------- */
/* [nombre, puesto, usuario de correo, teléfono] */
export type RepPerson = [string, string, string, string];

export interface RepZone {
  zone: string;
  states: string;
  people: RepPerson[];
}

export interface Distributor {
  name: string;
  city: string;
  cp: string;
  km: number;
  x: number;
  y: number;
  stock: boolean;
}

/* [título, id de YouTube, etiqueta opcional] */
export type Video = [string, string, string?];

/* ---------- Club MVZ ---------- */
/* [nombre de la regla, puntos, frecuencia] */
export type PointsRule = [string, number, string];
/* [nombre del premio, puntos, icono, id] */
export type Reward = [string, number, string, string];
