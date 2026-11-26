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

/* ---------- Academia v2.5 (API) ---------- */
/* Ajustes globales de la academia: aplican a todos los cursos por igual. */
export interface AcademySettings {
  enfoque: boolean;
  resumen: boolean;
  adminSinInsc: boolean;
  login: boolean;
  expira: boolean;
  pct: number;
  /* true = el alumno ve solo su calificación final, nunca el detalle de respuestas. */
  ocultar: boolean;
}

export interface Student {
  nombre: string;
  /* Correos ficticios @correo-ejemplo.mx, salvo el médico de demo. */
  correo: string;
  /* Fecha de registro DD/MM/AAAA. */
  registro: string;
}

export type AttemptRequestState = "pendiente" | "autorizado" | "rechazado";

/* Solicitud de intento adicional del examen final. */
export interface AttemptRequest {
  id: number;
  u: string;
  s: string;
  estado: AttemptRequestState;
  f: string;
}

export interface Group {
  id: number;
  nombre: string;
  /* Total de alumnos del grupo (los miembros listados son una muestra de ejemplo). */
  total: number;
  /* Slug del curso asignado ("" = sin asignar). */
  curso: string;
  /* Fecha límite DD/MM/AAAA ("" = sin fecha). */
  vence: string;
  avance: number;
  miembros: string[];
}

export type EditorQuestionType = "om" | "vf" | "rm" | "rel" | "ab";

export interface BankQuestion {
  id: number;
  texto: string;
  tipo: EditorQuestionType;
  tema: string;
  usos: number;
}

export interface Automation {
  id: number;
  nombre: string;
  disparador: string;
  mensaje: string;
  activa: boolean;
  correo: boolean;
  panel: boolean;
}

export type CertificateKind = "curso" | "diplomado" | "webinar";
export type CertificateOrigin = "migrada" | "academia" | "webinar";

/* Constancia emitida: registro propio que no cambia aunque cambie la plantilla o el curso. */
export interface Certificate {
  folio: string;
  u: string;
  tipo: CertificateKind;
  /* Slug del curso o del webinar. */
  ref: string;
  titulo: string;
  fecha: string;
  origen: CertificateOrigin;
  plantilla: string | null;
}

/* ---------- Club MVZ v2.5 ---------- */
export type RuleId = "cedula" | "webinar" | "curso" | "leccion";

export interface ClubRule {
  id: RuleId;
  nombre: string;
  puntos: number;
  frecuencia: string;
}

/* Si el id coincide con el slug de un curso, el canje inscribe al médico en ese curso. */
export interface ClubReward {
  id: string;
  nombre: string;
  puntos: number;
  icono: string;
}

/* ---------- Médicos y páginas ---------- */
export interface CedulaVerification {
  id: number;
  nombre: string;
  /* Cédula enmascarada. */
  cedula: string;
  verificado: boolean;
}

export type PageState = "Publicada" | "Borrador";

export interface SitePage {
  id: number;
  titulo: string;
  url: string;
  estado: PageState;
  /* Última edición DD/MM/AAAA. */
  edicion: string;
  bloques: string[];
  seo: { titulo: string; descripcion: string; idioma: Lang };
}

/* ---------- Webinars v2.5 ---------- */
export type WebinarMode = "cloudflare" | "youtube";

export interface WebinarSummary {
  slug: string;
  titulo: string;
  subtitulo: string;
  tituloEn: string;
  subtituloEn: string;
  grado: string;
  ponente: string;
  /* Inicio con zona horaria, ISO 8601. */
  inicio: string;
  /* DD/MM/AAAA */
  fecha: string;
  /* HH:MM, centro de México. */
  hora: string;
  /* Minutos. */
  duracion: number;
  /* Minutos en vivo para contar asistencia. */
  umbral: number;
  flyer: string | null;
  modo: WebinarMode;
  publicado: boolean;
}

/* ---------- Editor de cursos nuevos ---------- */
export type CourseKind = "Curso" | "Diplomado";

export interface EditorQuestion {
  tipo: EditorQuestionType;
  texto: string;
  puntos: number;
  requerida: boolean;
  mezclar: boolean;
  explicacion: string;
  opciones: string[];
  correctas: number[];
  pares: [string, string][];
  modelo: string;
}

export interface EditorAttachment {
  nombre: string;
  /* Bytes. */
  tam: number;
  key: string;
}

export interface EditorLesson {
  titulo: string;
  /* Video de Bunny Stream: solo librería e ID. El token de reproducción se firma en el servidor. */
  video: { lib: string; vid: string };
  /* Duración min:seg. */
  dur: string;
  adjuntos: EditorAttachment[];
  /* Fecha ISO AAAA-MM-DD; vacío = sin restricción. */
  desbloqueo: string;
}

export interface EditorModule {
  nombre: string;
  lecciones: EditorLesson[];
}

/* Examen final del curso (uno solo, en el módulo de cierre). */
export interface EditorExam extends ExamConfig {
  titulo: string;
  preguntas: EditorQuestion[];
}

export interface EditorCourse {
  id: string;
  /* Slug público, fijo desde la creación. */
  slug: string;
  titulo: string;
  tituloEn: string;
  tipo: CourseKind;
  categoria: string;
  instructor: string;
  nivel: string;
  /* MXN enteros, informativos. */
  precioRegular: number;
  precio: number;
  estado: CourseState;
  /* Fecha de creación DD/MM/AAAA. */
  fecha: string;
  /* Fecha ISO de publicación programada. */
  fechaProg: string;
  /* HTML limpio en el servidor con una lista de etiquetas permitidas. */
  descripcion: string;
  portada: string | null;
  modulos: EditorModule[];
  examen: EditorExam;
}
