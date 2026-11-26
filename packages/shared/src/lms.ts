/* Reglas del LMS v2.4, portadas de legacy/assets/js/app.js.
   Estructura tomada del uso real de Tutor LMS: curso -> módulos (temas) -> lecciones.
   - Los módulos solo agrupan lecciones. No hay examen por módulo: el curso tiene un solo examen, al final.
   - El precio de un curso es informativo. El acceso lo da únicamente una inscripción "approved".
   - Constancia = todas las lecciones al 100 % Y examen final aprobado. */

import type { Course, CourseModule, CourseState, ExamConfig, GradeCalc, Question, AnswerResult } from "./types";

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
