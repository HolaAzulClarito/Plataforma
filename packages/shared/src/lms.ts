/* Reglas del LMS v2.4, portadas de legacy/assets/js/app.js.
   Estructura tomada del uso real de Tutor LMS: curso -> módulos (temas) -> lecciones.
   - Los módulos solo agrupan lecciones. No hay examen por módulo: el curso tiene un solo examen, al final.
   - El precio de un curso es informativo. El acceso lo da únicamente una inscripción "approved".
   - Constancia = todas las lecciones al 100 % Y examen final aprobado. */

import type { Course, CourseModule, CourseState, EditorCourse, EditorQuestion, ExamConfig, GradeCalc, Question, AnswerResult } from "./types";

export const EXAM_DEFAULTS: ExamConfig = {
  aprobatoria: 80,
  intentos: 1,
  tiempo: 30,
  maxPreg: 0,
  desbloqueo: "",
  layout: "todas",
  orden: "aleatorio",
  lcAbierta: 2000,
  retro: "defecto",
  calculo: "mas_alta",
};

export const GRADE_CALC_LABEL: Record<GradeCalc, string> = {
  mas_alta: "Calificación más alta",
  promedio: "Promedio de los intentos",
  primer_intento: "Primer intento",
  ultimo_intento: "Último intento",
};

export const COURSE_STATE_LABEL: Record<CourseState, string> = {
  publicado: "Publicado",
  borrador: "Borrador",
  programado: "Programado",
  privado: "Privado",
  papelera: "Papelera",
};

export const examConfig = (override?: Partial<ExamConfig>): ExamConfig => ({ ...EXAM_DEFAULTS, ...override });

/* Número de lecciones reales (sin contar el examen final). */
export const lessonCount = (c: Pick<Course, "lessons"> | undefined): number => (c?.lessons || 12) - 1;

/* Divide las lecciones de un curso en módulos de tamaño parecido. */
export const courseModules = (c: Pick<Course, "lessons">): CourseModule[] => {
  const L = lessonCount(c);
  const k = L >= 12 ? 4 : L >= 4 ? 2 : 1;
  const size = Math.ceil(L / k) || 1;
  return Array.from({ length: k }, (_, i) => ({
    k: i + 1,
    from: i * size,
    to: Math.min(L, (i + 1) * size) - 1,
  })).filter((m) => m.from <= m.to);
};

export const lessonsDone = (done: readonly number[], c: Pick<Course, "lessons"> | undefined): boolean =>
  done.length >= lessonCount(c);

/* Desbloqueo por fecha (Content Drip mínimo). Devuelve la fecha ISO si la lección sigue bloqueada, o "". */
export interface DripRule {
  from: number;
  fecha: string;
}

export const dripDate = (
  rule: DripRule | undefined,
  c: Pick<Course, "lessons"> | undefined,
  i: number,
  todayIso: string,
): string => (rule && i >= rule.from && i < lessonCount(c) && todayIso < rule.fecha ? rule.fecha : "");

/* Siguiente lección pendiente y desbloqueada; -1 si ya terminó todas. */
export const nextLesson = (
  c: Pick<Course, "lessons"> | undefined,
  done: readonly number[],
  isLocked: (i: number) => boolean = () => false,
): number => {
  const L = lessonCount(c);
  for (let i = 0; i < L; i++) if (!done.includes(i) && !isLocked(i)) return i;
  if (done.length >= L) return -1;
  for (let i = 0; i < L; i++) if (!done.includes(i)) return i;
  return -1;
};

export const progressPct = (completed: number, c: Pick<Course, "lessons">): number =>
  Math.min(100, Math.round((completed / (c.lessons || 12)) * 100));

/* Intentos permitidos: los del examen (0 = sin límite) más los adicionales que autoriza la administración. */
export const maxAttempts = (base: number, extra = 0): number => (base ? base + extra : Infinity);

export const isPassing = (nota: number, aprobatoria: number): boolean => nota * 10 >= aprobatoria;

/* Calificación final según la regla del examen. */
export const finalGrade = (notas: readonly number[], calc: GradeCalc): number | undefined => {
  if (!notas.length) return undefined;
  const v =
    calc === "promedio"
      ? notas.reduce((x, y) => x + y, 0) / notas.length
      : calc === "primer_intento"
        ? notas[0]!
        : calc === "ultimo_intento"
          ? notas[notas.length - 1]!
          : Math.max(...notas);
  return Math.round(v * 10) / 10;
};

/* Califica un intento. answers: índice de pregunta -> opciones elegidas. */
export const gradeAnswers = (
  questions: readonly Question[],
  answers: ReadonlyArray<{ i: number; v: number[] }>,
): { nota: number; ans: AnswerResult[] } => {
  const ans = answers.map(({ i, v }) => {
    const q = questions[i];
    const ok = !!q && v.length === q.c.length && v.every((y) => q.c.includes(y));
    return { i, v, ok };
  });
  const nota = ans.length ? Math.round((ans.filter((a) => a.ok).length / ans.length) * 100) / 10 : 0;
  return { nota, ans };
};

/* Un curso es visible al público si está publicado, o programado con fecha cumplida. */
export const courseIsPublic = (state: CourseState = "publicado", fecha: string | undefined, todayIso: string): boolean =>
  state === "publicado" || (state === "programado" && !!fecha && fecha <= todayIso);

/* Duración de ejemplo del video de una lección (determinista por curso e índice). */
export const lessonDuration = (slug: string, i: number): string => {
  let h = 7;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  h = (h + (i + 1) * 2654435761) >>> 0;
  const s = 420 + (h % 1380);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/* Promedio ponderado de calificación de los cursos con reseñas. */
export const averageRating = (courses: readonly Pick<Course, "rating" | "reviews">[]): string => {
  const r = courses.filter((c) => c.reviews);
  const total = r.reduce((a, c) => a + c.reviews, 0);
  return total ? (r.reduce((a, c) => a + c.rating * c.reviews, 0) / total).toFixed(1) : "0.0";
};

/* ---------- Reglas v2.5 (API) ---------- */

/* Intentos que le quedan al alumno; Infinity si el examen no tiene límite. */
export const attemptsLeft = (max: number, used: number): number => (max === Infinity ? Infinity : Math.max(0, max - used));

/* La constancia exige las dos condiciones: todas las lecciones al 100 % y el examen final aprobado. */
export const canIssueCertificate = (allLessonsDone: boolean, examPassed: boolean): boolean => allLessonsDone && examPassed;

/* Días sin entrar a partir de los cuales un alumno se considera inactivo en reportes y calificaciones. */
export const INACTIVE_DAYS = 30;

/* Extrae librería e ID de un video de Bunny Stream (URL de embed/play o "librería/ID"). */
export const bunnyIds = (s: string | undefined): { lib: string; vid: string } | null => {
  const t = String(s ?? "");
  const m = /(?:iframe|player)\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(t);
  if (m) return { lib: m[1]!, vid: m[2]!.toLowerCase() };
  const g = /^\s*(\d+)\s*[/:,\s]\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*$/i.exec(t);
  return g ? { lib: g[1]!, vid: g[2]!.toLowerCase() } : null;
};

export const DURATION_RE = /^\d{1,3}:\d{2}(:\d{2})?$/;

/* Pendientes que impiden publicar un curso del editor. Lista vacía = se puede publicar. */
export const editorIssues = (c: Pick<EditorCourse, "modulos" | "examen">): string[] => {
  const p: string[] = [];
  if (!c.modulos.some((m) => m.lecciones.length)) p.push("El curso no tiene lecciones");
  c.modulos.forEach((m, a) =>
    m.lecciones.forEach((l) => {
      const w = `Módulo ${a + 1} · ${l.titulo}`;
      if (!l.video.lib) p.push(`${w}: falta el video de Bunny`);
      if (!DURATION_RE.test(l.dur || "")) p.push(`${w}: falta la duración del video`);
    }),
  );
  const w = `Cierre · ${c.examen.titulo}`;
  if (!c.examen.preguntas.length) p.push(`${w}: sin preguntas`);
  c.examen.preguntas.forEach((q, k) => {
    const n = k + 1;
    if (!q.texto.trim()) p.push(`${w}: la pregunta ${n} no tiene texto`);
    if ((q.tipo === "om" || q.tipo === "rm") && (!q.correctas.length || q.opciones.filter((o) => o.trim()).length < 2))
      p.push(`${w}: la pregunta ${n} necesita al menos dos opciones y una correcta`);
    if (q.tipo === "vf" && q.correctas.length !== 1) p.push(`${w}: la pregunta ${n} necesita marcar verdadero o falso`);
    if (q.tipo === "rel" && q.pares.some((x) => !x[0].trim() || !x[1].trim())) p.push(`${w}: la pregunta ${n} tiene parejas incompletas`);
  });
  return p;
};

/* Convierte las preguntas del editor en preguntas calificables automáticamente.
   Relacionar columnas y respuesta abierta las califica el equipo, así que no entran al examen automático. */
export const gradableQuestions = (qs: readonly EditorQuestion[]): Question[] =>
  qs.flatMap((q): Question[] => {
    if (q.tipo === "vf") return [{ t: "vf", q: q.texto, o: ["Verdadero", "Falso"], c: q.correctas.slice(0, 1) }];
    if (q.tipo === "om" || q.tipo === "rm") return [{ t: q.tipo, q: q.texto, o: q.opciones, c: q.correctas }];
    return [];
  });
