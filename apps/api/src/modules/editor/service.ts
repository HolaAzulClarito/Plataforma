/* Editor de cursos nuevos: datos básicos, temario (módulos y lecciones con video de Bunny, duración, archivos y fecha de
   desbloqueo) y el examen final del curso. Sin examen por módulo (ADR-005). */
import { randomBytes } from "node:crypto";
import {
  bunnyIds,
  DURATION_RE,
  editorIssues,
  EXAM_DEFAULTS,
  slugify,
  type EditorCourse,
  type EditorCourseCreateRequest,
  type EditorCourseDetail,
  type EditorCourseUpdateRequest,
  type EditorExamUpdateRequest,
  type EditorLesson,
  type EditorLessonUpdateRequest,
  type EditorQuestion,
  type EditorQuestionType,
  type ExamExport,
} from "@kiron/shared";
import { db } from "../../store";
import { hoyIso, hoyMx } from "../../lib/clock";
import { badRequest, conflict, notFound } from "../../lib/http";
import { sanitizeHtml } from "../../lib/sanitize";

export const MAX_MODULES = 12;
export const MAX_LESSONS_PER_MODULE = 60;
export const MAX_QUESTIONS = 200;

const newLesson = (titulo: string): EditorLesson => ({ titulo, video: { lib: "", vid: "" }, dur: "", adjuntos: [], desbloqueo: "" });

export const newQuestion = (tipo: EditorQuestionType): EditorQuestion => ({
  tipo,
  texto: "",
  puntos: 1,
  requerida: true,
  mezclar: false,
  explicacion: "",
  opciones: tipo === "om" || tipo === "rm" ? ["", "", "", ""] : [],
  correctas: tipo === "om" || tipo === "vf" ? [0] : [],
  pares: tipo === "rel" ? [["", ""], ["", ""], ["", ""]] : [],
  modelo: "",
});

const detail = (c: EditorCourse): EditorCourseDetail => ({ curso: c, pendientes: editorIssues(c) });

const courseOf = (id: string): EditorCourse => {
  const c = db().editor.find((x) => x.id === id);
  if (!c) throw notFound("Curso no encontrado en el editor");
  return c;
};

const moduleOf = (c: EditorCourse, mi: number) => {
  const m = c.modulos[mi];
  if (!m) throw notFound("Módulo no encontrado");
  return m;
};

const lessonOf = (c: EditorCourse, mi: number, li: number) => {
  const l = moduleOf(c, mi).lecciones[li];
  if (!l) throw notFound("Lección no encontrada");
  return l;
};

const totalLessons = (c: EditorCourse) => c.modulos.reduce((t, m) => t + m.lecciones.length, 0);

/* Slug público único entre el catálogo y el editor. */
const uniqueSlug = (titulo: string): string => {
  const base = slugify(titulo) || "curso";
  const taken = new Set([...db().cursos.map((c) => c.slug), ...db().editor.map((c) => c.slug)]);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
};

const checkPrices = (precio: number, regular: number) => {
  if (precio > regular && regular > 0) throw badRequest("El precio de oferta no puede ser mayor que el regular");
};

export const listEditorCourses = async (): Promise<EditorCourse[]> => db().editor;

export const getEditorCourse = async (id: string): Promise<EditorCourseDetail> => detail(courseOf(id));

export const createEditorCourse = async (b: EditorCourseCreateRequest): Promise<EditorCourseDetail> => {
  checkPrices(b.precio, b.precioRegular);
  const c: EditorCourse = {
    id: randomBytes(5).toString("hex"),
    slug: uniqueSlug(b.titulo),
    titulo: b.titulo,
    tituloEn: b.tituloEn,
    tipo: b.tipo,
    categoria: b.categoria,
    instructor: b.instructor,
    nivel: b.nivel,
    precioRegular: b.precioRegular || b.precio,
    precio: b.precio,
    estado: "borrador",
    fecha: hoyMx(),
    fechaProg: "",
    descripcion: "",
    portada: b.portada ?? null,
    modulos: b.modulos.map((m) => ({ nombre: m.nombre, lecciones: Array.from({ length: m.lecciones }, (_, k) => newLesson(`Lección ${k + 1}`)) })),
    examen: { ...EXAM_DEFAULTS, titulo: "Examen final", preguntas: [] },
  };
  db().editor.unshift(c);
  return detail(c);
};

/* Guarda los datos básicos. Si se pide publicar o programar y hay pendientes, el curso queda en borrador. */
export const updateEditorCourse = async (id: string, b: EditorCourseUpdateRequest): Promise<EditorCourseDetail> => {
  const c = courseOf(id);
  const precio = b.precio ?? c.precio;
  const regular = b.precioRegular ?? c.precioRegular;
  checkPrices(precio, regular);
  if (b.estado === "programado" && !((b.fechaProg ?? "") > hoyIso())) throw badRequest("Elige una fecha de publicación futura");
  const { estado, descripcion, ...rest } = b;
  Object.assign(c, rest);
  if (descripcion !== undefined) c.descripcion = sanitizeHtml(descripcion);
  if (!c.precioRegular) c.precioRegular = c.precio;
  if (estado) {
    const wantsPublic = estado === "publicado" || estado === "programado";
    c.estado = wantsPublic && editorIssues(c).length ? "borrador" : estado;
    c.fechaProg = c.estado === "programado" ? (b.fechaProg ?? "") : "";
  }
  return detail(c);
};

export const publishEditorCourse = async (id: string): Promise<EditorCourseDetail> => {
  const c = courseOf(id);
  const p = editorIssues(c);
  if (p.length) throw conflict("El curso tiene pendientes antes de publicarse", { pendientes: p });
  c.estado = "publicado";
  c.fechaProg = "";
  return detail(c);
};

export const addModule = async (id: string, nombre?: string): Promise<EditorCourseDetail> => {
  const c = courseOf(id);
  if (c.modulos.length >= MAX_MODULES) throw conflict(`Máximo ${MAX_MODULES} módulos por curso`);
  c.modulos.push({ nombre: nombre || `Módulo ${c.modulos.length + 1}`, lecciones: [newLesson("Lección 1")] });
  return detail(c);
};

export const renameModule = async (id: string, mi: number, nombre: string): Promise<EditorCourseDetail> => {
  const c = courseOf(id);
  moduleOf(c, mi).nombre = nombre;
  return detail(c);
};

export const addLesson = async (id: string, mi: number, titulo?: string): Promise<EditorCourseDetail> => {
  const c = courseOf(id);
  const m = moduleOf(c, mi);
  if (m.lecciones.length >= MAX_LESSONS_PER_MODULE) throw conflict(`Máximo ${MAX_LESSONS_PER_MODULE} lecciones por módulo`);
  m.lecciones.push(newLesson(titulo || `Lección ${m.lecciones.length + 1}`));
  return detail(c);
};

export const updateLesson = async (id: string, mi: number, li: number, b: EditorLessonUpdateRequest): Promise<EditorCourseDetail> => {
  const c = courseOf(id);
  const l = lessonOf(c, mi, li);
  if (b.video !== undefined) {
    if (b.video === "") l.video = { lib: "", vid: "" };
    else {
      const ids = bunnyIds(b.video);
      if (!ids) throw badRequest("No encontramos la librería y el ID del video en lo que pegaste");
      l.video = ids;
    }
  }
  if (b.dur !== undefined) {
    if (b.dur && !DURATION_RE.test(b.dur)) throw badRequest("Escribe la duración como min:seg, por ejemplo 12:40");
    l.dur = b.dur;
  }
  if (b.titulo !== undefined) l.titulo = b.titulo;
  if (b.desbloqueo !== undefined) l.desbloqueo = b.desbloqueo;
  return detail(c);
};

export const deleteLesson = async (id: string, mi: number, li: number): Promise<EditorCourseDetail> => {
  const c = courseOf(id);
  lessonOf(c, mi, li);
  if (totalLessons(c) <= 1) throw conflict("El curso necesita al menos una lección");
  moduleOf(c, mi).lecciones.splice(li, 1);
  return detail(c);
};

export const moveLesson = async (id: string, mi: number, li: number, dir: -1 | 1): Promise<EditorCourseDetail> => {
  const c = courseOf(id);
  const a = moduleOf(c, mi).lecciones;
  lessonOf(c, mi, li);
  const j = li + dir;
  if (j < 0 || j >= a.length) throw conflict("La lección ya está en el extremo del módulo");
  [a[li], a[j]] = [a[j]!, a[li]!];
  return detail(c);
};

const ATTACH_RE = /\.(pdf|docx?|xlsx?|pptx?|zip)$/i;
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

/* Solo metadatos: en la plataforma el archivo se guarda en almacenamiento privado con enlace firmado. */
export const addAttachment = async (id: string, mi: number, li: number, nombre: string, tam: number): Promise<EditorCourseDetail> => {
  const c = courseOf(id);
  if (!ATTACH_RE.test(nombre)) throw badRequest("Tipo de archivo no permitido (PDF, Word, Excel, PowerPoint o ZIP)");
  lessonOf(c, mi, li).adjuntos.push({ nombre, tam, key: randomBytes(4).toString("hex") });
  return detail(c);
};

export const deleteAttachment = async (id: string, mi: number, li: number, k: number): Promise<EditorCourseDetail> => {
  const c = courseOf(id);
  const l = lessonOf(c, mi, li);
  if (!l.adjuntos[k]) throw notFound("Archivo no encontrado");
  l.adjuntos.splice(k, 1);
  return detail(c);
};

/* ---------- Examen final ---------- */

export const updateExam = async (id: string, b: EditorExamUpdateRequest): Promise<EditorCourseDetail> => {
  const c = courseOf(id);
  if (db().ajustes.ocultar && b.retro === "revelar") throw badRequest("Con el ajuste Ocultar activo no se pueden revelar las respuestas");
  Object.assign(c.examen, b);
  return detail(c);
};

const assertRoom = (c: EditorCourse, n: number) => {
  if (c.examen.preguntas.length + n > MAX_QUESTIONS) throw conflict(`Máximo ${MAX_QUESTIONS} preguntas por examen`);
};

export const addQuestion = async (id: string, tipo: EditorQuestionType): Promise<EditorCourseDetail> => {
  const c = courseOf(id);
  assertRoom(c, 1);
  c.examen.preguntas.push(newQuestion(tipo));
  return detail(c);
};

/* Normaliza una pregunta: correctas dentro de las opciones; una sola en om/vf. */
export const normalizeQuestion = (q: EditorQuestion): EditorQuestion => {
  const nOpts = q.tipo === "vf" ? 2 : q.opciones.length;
  let correctas = [...new Set(q.correctas)].filter((k) => k < nOpts);
  if (q.tipo === "om" || q.tipo === "vf") correctas = correctas.slice(0, 1);
  if (q.tipo === "rel" || q.tipo === "ab") correctas = [];
  return {
    ...q,
    opciones: q.tipo === "om" || q.tipo === "rm" ? q.opciones : [],
    correctas,
    pares: q.tipo === "rel" ? q.pares : [],
    modelo: q.tipo === "ab" ? q.modelo : "",
  };
};

export const putQuestion = async (id: string, qi: number, q: EditorQuestion): Promise<EditorCourseDetail> => {
  const c = courseOf(id);
  if (!c.examen.preguntas[qi]) throw notFound("Pregunta no encontrada");
  c.examen.preguntas[qi] = normalizeQuestion(q);
  return detail(c);
};

export const deleteQuestion = async (id: string, qi: number): Promise<EditorCourseDetail> => {
  const c = courseOf(id);
  if (!c.examen.preguntas[qi]) throw notFound("Pregunta no encontrada");
  c.examen.preguntas.splice(qi, 1);
  return detail(c);
};

export const addFromBank = async (id: string, ids: number[]): Promise<EditorCourseDetail> => {
  const c = courseOf(id);
  const qs = [...new Set(ids)].map((i) => db().banco.find((b) => b.id === i));
  if (qs.some((q) => !q)) throw notFound("Alguna pregunta no está en el banco");
  assertRoom(c, qs.length);
  for (const b of qs) {
    c.examen.preguntas.push({ ...newQuestion(b!.tipo), texto: b!.texto });
    b!.usos += 1;
  }
  return detail(c);
};

/* Importa preguntas de un examen exportado desde la academia (formato kiron-examen). Las reglas no se importan. */
export const importExam = async (id: string, preguntas: EditorQuestion[]): Promise<EditorCourseDetail> => {
  const c = courseOf(id);
  assertRoom(c, preguntas.length);
  c.examen.preguntas.push(...preguntas.map(normalizeQuestion));
  return detail(c);
};

export const exportExam = async (id: string): Promise<ExamExport> => {
  const { titulo, preguntas, ...ajustes } = courseOf(id).examen;
  return { formato: "kiron-examen", version: 1, titulo, ajustes, preguntas };
};
