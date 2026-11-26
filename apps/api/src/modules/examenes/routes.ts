import { Hono } from "hono";
import { z } from "zod";
import { DEMO_USER } from "@kiron/shared";
import { v } from "../../lib/http";
import { DateRangeSchema, IdParam, slug, SlugParam, text } from "../../lib/schemas";
import { attemptDetail, getExamStatus, listAttempts, listRequests, requestExtraAttempt, resolveRequest, startExam, submitExam } from "./service";

const ME = DEMO_USER.name;

const SubmitBody = z.object({
  sesion: z.uuid(),
  respuestas: z
    .array(z.object({ i: z.number().int().min(0).max(199), v: z.array(z.number().int().min(0).max(9)).max(10) }))
    .max(200)
    .refine((a) => new Set(a.map((x) => x.i)).size === a.length, "Pregunta repetida"),
});

export const examenesMe = new Hono()
  .get("/cursos/:slug/examen", v("param", SlugParam), async (c) => c.json(await getExamStatus(ME, c.req.valid("param").slug)))
  .post("/cursos/:slug/examen/iniciar", v("param", SlugParam), async (c) => c.json(await startExam(ME, c.req.valid("param").slug)))
  .post("/cursos/:slug/examen/intentos", v("param", SlugParam), v("json", SubmitBody), async (c) =>
    c.json(await submitExam(ME, c.req.valid("param").slug, c.req.valid("json"))),
  )
  .post("/cursos/:slug/examen/solicitudes", v("param", SlugParam), async (c) => c.json(await requestExtraAttempt(ME, c.req.valid("param").slug), 201));

const AttemptsQuery = z.object({ curso: slug.optional(), q: text(120).optional(), rango: DateRangeSchema.optional() });

export const examenesAdmin = new Hono()
  .get("/academia/solicitudes", async (c) => c.json(await listRequests()))
  .post("/academia/solicitudes/:id", v("param", IdParam), v("json", z.object({ accion: z.enum(["autorizar", "rechazar"]) })), async (c) =>
    c.json(await resolveRequest(c.req.valid("param").id, c.req.valid("json").accion === "autorizar")),
  )
  .get("/academia/intentos", v("query", AttemptsQuery), async (c) => c.json(await listAttempts(c.req.valid("query"))))
  .get("/academia/intentos/:id", v("param", IdParam), async (c) => c.json(await attemptDetail(c.req.valid("param").id)));
