import { Hono } from "hono";
import { z } from "zod";
import { v } from "../../lib/http";
import { QuestionTypeSchema, required, text } from "../../lib/schemas";
import {
  AttachmentBody,
  AttachmentParam,
  CourseParam,
  CreateBody,
  EditorQuestionSchema,
  ExamBody,
  ExamImportBody,
  LessonBody,
  LessonParam,
  ModuleParam,
  QuestionParam,
  UpdateBody,
} from "./schemas";
import {
  addAttachment,
  addFromBank,
  addLesson,
  addModule,
  addQuestion,
  createEditorCourse,
  deleteAttachment,
  deleteLesson,
  deleteModule,
  deleteQuestion,
  exportExam,
  getEditorCourse,
  importExam,
  listEditorCourses,
  moveLesson,
  publishEditorCourse,
  putQuestion,
  renameModule,
  updateEditorCourse,
  updateExam,
  updateLesson,
} from "./service";

const base = "/editor/cursos/:id";
const les = `${base}/modulos/:mi/lecciones/:li`;

export const editorAdmin = new Hono()
  .get("/editor/cursos", async (c) => c.json(await listEditorCourses()))
  .post("/editor/cursos", v("json", CreateBody), async (c) => c.json(await createEditorCourse(c.req.valid("json")), 201))
  .get(base, v("param", CourseParam), async (c) => c.json(await getEditorCourse(c.req.valid("param").id)))
  .patch(base, v("param", CourseParam), v("json", UpdateBody), async (c) => c.json(await updateEditorCourse(c.req.valid("param").id, c.req.valid("json"))))
  .post(`${base}/publicar`, v("param", CourseParam), async (c) => c.json(await publishEditorCourse(c.req.valid("param").id)))
  /* Temario */
  .post(`${base}/modulos`, v("param", CourseParam), v("json", z.object({ nombre: text(120).optional() })), async (c) =>
    c.json(await addModule(c.req.valid("param").id, c.req.valid("json").nombre), 201),
  )
  .patch(`${base}/modulos/:mi`, v("param", ModuleParam), v("json", z.object({ nombre: required(120) })), async (c) => {
    const p = c.req.valid("param");
    return c.json(await renameModule(p.id, p.mi, c.req.valid("json").nombre));
  })
  .delete(`${base}/modulos/:mi`, v("param", ModuleParam), async (c) => {
    const p = c.req.valid("param");
    return c.json(await deleteModule(p.id, p.mi));
  })
  .post(`${base}/modulos/:mi/lecciones`, v("param", ModuleParam), v("json", z.object({ titulo: text(120).optional() })), async (c) => {
    const p = c.req.valid("param");
    return c.json(await addLesson(p.id, p.mi, c.req.valid("json").titulo), 201);
  })
  .patch(les, v("param", LessonParam), v("json", LessonBody), async (c) => {
    const p = c.req.valid("param");
    return c.json(await updateLesson(p.id, p.mi, p.li, c.req.valid("json")));
  })
  .delete(les, v("param", LessonParam), async (c) => {
    const p = c.req.valid("param");
    return c.json(await deleteLesson(p.id, p.mi, p.li));
  })
  .post(`${les}/mover`, v("param", LessonParam), v("json", z.object({ dir: z.union([z.literal(-1), z.literal(1)]) })), async (c) => {
    const p = c.req.valid("param");
    return c.json(await moveLesson(p.id, p.mi, p.li, c.req.valid("json").dir));
  })
  .post(`${les}/adjuntos`, v("param", LessonParam), v("json", AttachmentBody), async (c) => {
    const p = c.req.valid("param");
    const b = c.req.valid("json");
    return c.json(await addAttachment(p.id, p.mi, p.li, b.nombre, b.tam), 201);
  })
  .delete(`${les}/adjuntos/:k`, v("param", AttachmentParam), async (c) => {
    const p = c.req.valid("param");
    return c.json(await deleteAttachment(p.id, p.mi, p.li, p.k));
  })
  /* Examen final */
  .patch(`${base}/examen`, v("param", CourseParam), v("json", ExamBody), async (c) => c.json(await updateExam(c.req.valid("param").id, c.req.valid("json"))))
  .post(`${base}/examen/preguntas`, v("param", CourseParam), v("json", z.object({ tipo: QuestionTypeSchema })), async (c) =>
    c.json(await addQuestion(c.req.valid("param").id, c.req.valid("json").tipo), 201),
  )
  .put(`${base}/examen/preguntas/:qi`, v("param", QuestionParam), v("json", EditorQuestionSchema), async (c) => {
    const p = c.req.valid("param");
    return c.json(await putQuestion(p.id, p.qi, c.req.valid("json")));
  })
  .delete(`${base}/examen/preguntas/:qi`, v("param", QuestionParam), async (c) => {
    const p = c.req.valid("param");
    return c.json(await deleteQuestion(p.id, p.qi));
  })
  .post(`${base}/examen/banco`, v("param", CourseParam), v("json", z.object({ ids: z.array(z.number().int().min(1)).min(1).max(200) })), async (c) =>
    c.json(await addFromBank(c.req.valid("param").id, c.req.valid("json").ids)),
  )
  .post(`${base}/examen/importar`, v("param", CourseParam), v("json", ExamImportBody), async (c) =>
    c.json(await importExam(c.req.valid("param").id, c.req.valid("json").preguntas)),
  )
  .get(`${base}/examen/exportar`, v("param", CourseParam), async (c) => c.json(await exportExam(c.req.valid("param").id)));
