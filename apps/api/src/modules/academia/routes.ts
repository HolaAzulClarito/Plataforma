import { Hono } from "hono";
import { z } from "zod";
import { v } from "../../lib/http";
import { DateRangeSchema, IdParam, isoDate, QuestionTypeSchema, required, slug, text } from "../../lib/schemas";
import { examConfigRows } from "../cursos/service";
import {
  addBankQuestion,
  assignGroup,
  createGroup,
  getSettings,
  groupDetail,
  history,
  importStudents,
  listAutomations,
  listBank,
  listGradebook,
  listGroups,
  listStudents,
  report,
  reportCsv,
  updateAutomation,
  updateSettings,
} from "./service";

const SettingsBody = z
  .object({
    enfoque: z.boolean(),
    resumen: z.boolean(),
    adminSinInsc: z.boolean(),
    login: z.boolean(),
    expira: z.boolean(),
    pct: z.number().int().min(1).max(100),
    ocultar: z.boolean(),
  })
  .partial();

const StudentsQuery = z.object({
  curso: slug.optional(),
  rango: DateRangeSchema.optional(),
  orden: z.enum(["recientes", "nombre", "cursos"]).optional(),
  q: text(120).optional(),
});

const ImportBody = z.object({
  grupo: z.number().int().min(1).optional(),
  alumnos: z
    .array(z.object({ nombre: required(120), correo: z.email().max(160) }))
    .min(1)
    .max(5000),
});

export const academiaAdmin = new Hono()
  .get("/academia/ajustes", async (c) => c.json(await getSettings()))
  .patch("/academia/ajustes", v("json", SettingsBody), async (c) => c.json(await updateSettings(c.req.valid("json"))))
  .get("/academia/examenes", async (c) => c.json(await examConfigRows()))
  .get("/academia/calificaciones", v("query", z.object({ curso: slug.optional() })), async (c) => c.json(await listGradebook(c.req.valid("query").curso)))
  .get("/academia/calificaciones/historial", v("query", z.object({ alumno: required(120), curso: slug })), async (c) => {
    const q = c.req.valid("query");
    return c.json(await history(q.alumno, q.curso));
  })
  .get("/academia/alumnos", v("query", StudentsQuery), async (c) => c.json(await listStudents(c.req.valid("query"))))
  .post("/academia/alumnos/importar", v("json", ImportBody), async (c) => c.json(await importStudents(c.req.valid("json"))))
  .get("/academia/grupos", async (c) => c.json(await listGroups()))
  .post("/academia/grupos", v("json", z.object({ nombre: required(120) })), async (c) => c.json(await createGroup(c.req.valid("json").nombre), 201))
  .get("/academia/grupos/:id", v("param", IdParam), async (c) => c.json(await groupDetail(c.req.valid("param").id)))
  .patch("/academia/grupos/:id", v("param", IdParam), v("json", z.object({ curso: slug, vence: isoDate })), async (c) => {
    const b = c.req.valid("json");
    return c.json(await assignGroup(c.req.valid("param").id, b.curso, b.vence));
  })
  .get("/academia/banco", async (c) => c.json(await listBank()))
  .post("/academia/banco", v("json", z.object({ texto: required(600), tipo: QuestionTypeSchema, tema: required(80) })), async (c) => c.json(await addBankQuestion(c.req.valid("json")), 201))
  .get("/academia/automatizaciones", async (c) => c.json(await listAutomations()))
  .patch(
    "/academia/automatizaciones/:id",
    v("param", IdParam),
    v("json", z.object({ activa: z.boolean(), correo: z.boolean(), panel: z.boolean() }).partial()),
    async (c) => c.json(await updateAutomation(c.req.valid("param").id, c.req.valid("json"))),
  )
  .get("/academia/reportes", async (c) => c.json(await report()))
  .get("/academia/reportes/:tipo", v("param", z.object({ tipo: z.enum(["alumno", "curso", "instructor", "avance", "inactividad"]) })), async (c) => {
    const tipo = c.req.valid("param").tipo;
    return c.body(await reportCsv(tipo), 200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-${tipo}-kiron-demo.csv"`,
    });
  });
