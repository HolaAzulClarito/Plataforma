import { Hono } from "hono";
import { z } from "zod";
import { v } from "../../lib/http";
import { imageDataUrl, required, slug, text } from "../../lib/schemas";
import { createTemplate, getTemplate, listTemplates, setTemplateImage, updateTemplate } from "./service";

const TemplateParam = z.object({ id: z.string().regex(/^c\d{1,6}$/) });

const VarPatch = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), size: z.number().min(1).max(200), on: z.boolean() }).partial();

const UpdateBody = z.object({
  nombre: required(80).optional(),
  estado: z.enum(["published", "draft"]).optional(),
  cursos: z.array(slug).max(200).optional(),
  vars: z.object({ nombre: VarPatch, curso: VarPatch, fecha: VarPatch, folio: VarPatch, qr: VarPatch }).partial().optional(),
});

export const plantillasAdmin = new Hono()
  .get("/academia/plantillas", async (c) => c.json(await listTemplates()))
  .post("/academia/plantillas", v("json", z.object({ nombre: text(80).optional() })), async (c) => c.json(await createTemplate(c.req.valid("json").nombre), 201))
  .get("/academia/plantillas/:id", v("param", TemplateParam), async (c) => c.json(await getTemplate(c.req.valid("param").id)))
  .patch("/academia/plantillas/:id", v("param", TemplateParam), v("json", UpdateBody), async (c) => c.json(await updateTemplate(c.req.valid("param").id, c.req.valid("json"))))
  .put("/academia/plantillas/:id/imagen", v("param", TemplateParam), v("json", z.object({ imagen: imageDataUrl(["jpeg", "png"], 3 * 1024 * 1024) })), async (c) =>
    c.json(await setTemplateImage(c.req.valid("param").id, c.req.valid("json").imagen)),
  )
  .delete("/academia/plantillas/:id/imagen", v("param", TemplateParam), async (c) => c.json(await setTemplateImage(c.req.valid("param").id, null)));
