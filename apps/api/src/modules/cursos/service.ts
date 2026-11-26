/* Cursos: une el catálogo real (data/real/cursos.json) con los cursos creados en el editor. */
import {
  COURSE_STATE_LABEL,
  courseIsPublic,
  courseModules,
  dripDate,
  editorIssues,
  EXAM_DEFAULTS,
  examConfig,
  gradableQuestions,
  inRange,
  lessonCount,
  lessonDuration,
  normalize,
  type AdminCourseList,
  type AdminCourseRow,
  type Course,
  type CourseDetail,
  type CourseKind,
  type CourseModule,
  type CourseState,
  type CourseStateFilter,
  type DateRange,
  type EditorCourse,
  type ExamConfig,
  type LessonInfo,
  type Question,
} from "@kiron/shared";
import { db } from "../../store";
import { hoyIso } from "../../lib/clock";
import { badRequest, forbidden, notFound } from "../../lib/http";

export interface CourseRef {
  course: Course;
  origen: "catalogo" | "editor";
  editor: EditorCourse | null;
  estado: CourseState;
  /* Fecha ISO de publicación programada. */
  fechaProg: string;
}

const editorLessons = (e: EditorCourse) => e.modulos.flatMap((m) => m.lecciones);

export const editorToCourse = (e: EditorCourse): Course => ({
  slug: e.slug,
  title: e.titulo,
  cat: e.categoria,
  lessons: editorLessons(e).length + 1,
  rating: 0,
  reviews: 0,
  price: e.precio,
  ...(e.precioRegular > e.precio ? { was: e.precioRegular } : {}),
  tone: "b",
  ...(e.portada ? { img: e.portada } : {}),
});

const refOfCatalog = (c: Course): CourseRef => {
  const st = db().estados[c.slug];
  return { course: c, origen: "catalogo", editor: null, estado: st?.estado ?? "publicado", fechaProg: st?.fecha ?? "" };
};

const refOfEditor = (e: EditorCourse): CourseRef => ({
  course: editorToCourse(e),
  origen: "editor",
  editor: e,
  estado: e.estado,
  fechaProg: e.fechaProg,
});

export const allCourses = (): CourseRef[] => [...db().editor.map(refOfEditor), ...db().cursos.map(refOfCatalog)];

export const findCourse = (slug: string): CourseRef | undefined => {
  const c = db().cursos.find((x) => x.slug === slug);
  if (c) return refOfCatalog(c);
  const e = db().editor.find((x) => x.slug === slug);
  return e ? refOfEditor(e) : undefined;
};

export const getCourse = (slug: string): CourseRef => {
  const r = findCourse(slug);
  if (!r) throw notFound("Curso no encontrado");
  return r;
};

export const isVisible = (r: CourseRef): boolean => courseIsPublic(r.estado, r.fechaProg, hoyIso());

export const courseTitle = (slug: string): string => findCourse(slug)?.course.title ?? slug;

export const courseKind = (r: CourseRef): CourseKind => (r.editor ? r.editor.tipo : r.course.price ? "Diplomado" : "Curso");

export const lessonsOf = (r: CourseRef): number => lessonCount(r.course);

export const modulesOf = (r: CourseRef): CourseModule[] => {
  if (!r.editor) return courseModules(r.course);
  const out: CourseModule[] = [];
  let from = 0;
  r.editor.modulos.forEach((m, k) => {
    if (m.lecciones.length) out.push({ k: k + 1, from, to: from + m.lecciones.length - 1 });
    from += m.lecciones.length;
  });
  return out;
};

/* Fecha ISO hasta la que la lección sigue bloqueada, o "". */
export const lessonLockedUntil = (r: CourseRef, i: number): string => {
  if (r.editor) {
    const d = editorLessons(r.editor)[i]?.desbloqueo ?? "";
    return d && hoyIso() < d ? d : "";
  }
  return dripDate(db().drip[r.course.slug], r.course, i, hoyIso());
};

export const lessonInfo = (r: CourseRef): LessonInfo[] => {
  const mods = modulesOf(r);
  const ed = r.editor ? editorLessons(r.editor) : null;
  return Array.from({ length: lessonsOf(r) }, (_, i) => ({
    i,
    modulo: mods.find((m) => i >= m.from && i <= m.to)?.k ?? 1,
    titulo: ed?.[i]?.titulo ?? `Lección ${String(i + 1).padStart(2, "0")}`,
    duracion: ed?.[i]?.dur || lessonDuration(r.course.slug, i),
    bloqueadaHasta: lessonLockedUntil(r, i),
  }));
};

/* Examen final del curso: reglas y preguntas calificables. Los cursos del catálogo usan el examen de ejemplo. */
export const examOf = (r: CourseRef): { config: ExamConfig; preguntas: Question[] } => {
  if (r.editor) {
    const e = r.editor.examen;
    const cfg = Object.fromEntries((Object.keys(EXAM_DEFAULTS) as (keyof ExamConfig)[]).map((k) => [k, e[k]])) as Partial<ExamConfig>;
    return { config: examConfig(cfg), preguntas: gradableQuestions(e.preguntas) };
  }
  return { config: examConfig(db().examenes[r.course.slug]), preguntas: db().examenEjemplo };
};

export const setExamConfig = (r: CourseRef, cfg: ExamConfig): ExamConfig => {
  if (r.editor) Object.assign(r.editor.examen, cfg);
  else db().examenes[r.course.slug] = { ...cfg };
  return examOf(r).config;
};

export const hasPublishedTemplate = (slug: string): boolean =>
  db().plantillas.some((t) => t.estado === "published" && t.cursos.includes(slug));

/* ---------- Público ---------- */

export const listPublicCourses = async (todos: boolean): Promise<Course[]> =>
  allCourses()
    .filter((r) => todos || isVisible(r))
    .map((r) => r.course);

export const courseDetail = async (slug: string, opts: { admin: boolean; withSession: boolean; full?: boolean }): Promise<CourseDetail> => {
  const r = getCourse(slug);
  if (!isVisible(r) && !opts.admin) throw notFound("Curso no disponible");
  const g = db().ajustes;
  const showSyllabus = opts.full || (g.resumen && (!g.login || opts.withSession));
  const { config, preguntas } = examOf(r);
  return {
    course: r.course,
    estado: r.estado,
    tipo: courseKind(r),
    origen: r.origen,
    modulos: modulesOf(r),
    temario: showSyllabus ? lessonInfo(r) : null,
    instructor: r.editor?.instructor ?? "",
    descripcion: r.editor?.descripcion ?? "",
    examen: { preguntas: config.maxPreg ? Math.min(config.maxPreg, preguntas.length) : preguntas.length, aprobatoria: config.aprobatoria, intentos: config.intentos, tiempo: config.tiempo, desbloqueo: config.desbloqueo },
    constancia: hasPublishedTemplate(slug),
    /* Solo ajustes no sensibles que el alumno necesita para su vista (ADR-005, hallazgo 4 del dictamen). */
    ajustes: { enfoque: g.enfoque },
  };
};

/* ---------- Administración ---------- */

const catalogDate = (c: Course): string => {
  const m = /uploads\/(\d{4})\/(\d{2})\//.exec(c.img ?? "");
  return m ? `01/${m[2]}/${m[1]}` : "";
};

const rowOf = (r: CourseRef): AdminCourseRow =>
  r.editor
    ? {
        key: "n:" + r.editor.id,
        slug: r.editor.slug,
        titulo: r.editor.titulo,
        autor: r.editor.instructor,
        cat: r.editor.categoria,
        temas: r.editor.modulos.length,
        lecciones: editorLessons(r.editor).length,
        regular: r.editor.precioRegular,
        oferta: r.editor.precio,
        fecha: r.editor.fecha,
        estado: r.estado,
        fechaProg: r.fechaProg,
        nuevo: true,
      }
    : {
        key: "s:" + r.course.slug,
        slug: r.course.slug,
        titulo: r.course.title,
        autor: "",
        cat: r.course.cat,
        temas: courseModules(r.course).length || 1,
        lecciones: lessonsOf(r),
        regular: r.course.was || r.course.price || 0,
        oferta: r.course.price || 0,
        fecha: catalogDate(r.course),
        estado: r.estado,
        fechaProg: r.fechaProg,
        nuevo: false,
      };

export interface AdminCourseFilter {
  estado?: CourseStateFilter;
  cat?: string;
  q?: string;
  rango?: DateRange;
}

export const adminCourseList = async (f: AdminCourseFilter): Promise<AdminCourseList> => {
  const all = allCourses().map(rowOf);
  const st = f.estado ?? "todos";
  const items = all.filter(
    (r) =>
      (st === "todos" ? r.estado !== "papelera" : r.estado === st) &&
      (!f.cat || r.cat === f.cat) &&
      (!f.q || normalize(r.titulo).includes(normalize(f.q))) &&
      (!r.fecha || inRange(r.fecha, f.rango ?? "")),
  );
  const conteo = { todos: all.filter((r) => r.estado !== "papelera").length } as Record<CourseStateFilter, number>;
  (Object.keys(COURSE_STATE_LABEL) as CourseState[]).forEach((k) => {
    conteo[k] = all.filter((r) => r.estado === k).length;
  });
  return { items, conteo };
};

const validateSchedule = (estado: CourseState, fecha: string | undefined) => {
  if (estado === "programado" && !(fecha && fecha > hoyIso())) throw badRequest("Elige una fecha de publicación futura");
};

export const setCatalogState = async (slug: string, estado: CourseState, fecha?: string): Promise<AdminCourseRow> => {
  const r = getCourse(slug);
  validateSchedule(estado, fecha);
  if (r.editor) {
    if ((estado === "publicado" || estado === "programado") && editorIssues(r.editor).length) throw badRequest("El curso tiene pendientes; revísalo en el editor");
    r.editor.estado = estado;
    r.editor.fechaProg = estado === "programado" ? fecha! : "";
  } else {
    db().estados[slug] = { estado, fecha: estado === "programado" ? fecha! : "" };
  }
  return rowOf(getCourse(slug));
};

export const bulkCourseState = async (claves: string[], estado: CourseState): Promise<{ actualizados: number; omitidos: number }> => {
  if (estado === "programado") throw badRequest("Programa los cursos uno por uno, con su fecha");
  let actualizados = 0;
  let omitidos = 0;
  for (const key of new Set(claves)) {
    if (key.startsWith("s:")) {
      const slug = key.slice(2);
      if (!db().cursos.some((c) => c.slug === slug)) {
        omitidos++;
        continue;
      }
      db().estados[slug] = { estado, fecha: "" };
      actualizados++;
    } else if (key.startsWith("n:")) {
      const e = db().editor.find((x) => x.id === key.slice(2));
      if (!e || (estado === "publicado" && editorIssues(e).length)) {
        omitidos++;
        continue;
      }
      e.estado = estado;
      e.fechaProg = "";
      actualizados++;
    } else omitidos++;
  }
  return { actualizados, omitidos };
};

export const adminPreview = async (slug: string): Promise<CourseDetail> => {
  if (!db().ajustes.adminSinInsc) throw forbidden("La vista sin inscripción está desactivada en Ajustes");
  return courseDetail(slug, { admin: true, withSession: true, full: true });
};

export const getExamConfig = async (slug: string): Promise<ExamConfig> => examOf(getCourse(slug)).config;

export const putExamConfig = async (slug: string, cfg: ExamConfig): Promise<ExamConfig> => {
  const r = getCourse(slug);
  if (db().ajustes.ocultar && cfg.retro === "revelar") throw badRequest("Con el ajuste Ocultar activo no se pueden revelar las respuestas");
  return setExamConfig(r, cfg);
};

export const examConfigRows = async () =>
  allCourses().map((r) => ({ slug: r.course.slug, titulo: r.course.title, config: examOf(r).config }));

