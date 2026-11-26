import { Hono } from "hono";
import { z } from "zod";
import { DEMO_USER } from "@kiron/shared";
import { v } from "../../lib/http";
import { DateRangeSchema, EnrollmentStateSchema, IdParam, slug, text } from "../../lib/schemas";
import { adminEnroll, adminEnrollments, bulkEnrollmentState, myEnrollments, requestEnrollment, setEnrollmentState } from "./service";

const ME = DEMO_USER.name;

export const inscripcionesMe = new Hono()
  .get("/inscripciones", async (c) => c.json(await myEnrollments(ME)))
  .post("/inscripciones", v("json", z.object({ curso: slug })), async (c) => c.json(await requestEnrollment(ME, c.req.valid("json").curso), 201));

const AdminQuery = z.object({
  curso: slug.optional(),
  estado: EnrollmentStateSchema.optional(),
  q: text(120).optional(),
  rango: DateRangeSchema.optional(),
});

export const inscripcionesAdmin = new Hono()
  .get("/inscripciones", v("query", AdminQuery), async (c) => c.json(await adminEnrollments(c.req.valid("query"))))
  .post("/inscripciones", v("json", z.object({ curso: slug, correos: z.array(z.email().max(160)).min(1).max(500) })), async (c) => {
    const b = c.req.valid("json");
    return c.json(await adminEnroll(b.curso, b.correos), 201);
  })
  .post("/inscripciones/lote", v("json", z.object({ ids: z.array(z.number().int().min(1)).min(1).max(5000), estado: EnrollmentStateSchema })), async (c) => {
    const b = c.req.valid("json");
    return c.json(await bulkEnrollmentState(b.ids, b.estado));
  })
  .patch("/inscripciones/:id", v("param", IdParam), v("json", z.object({ estado: EnrollmentStateSchema })), async (c) =>
    c.json(await setEnrollmentState(c.req.valid("param").id, c.req.valid("json").estado)),
  );
