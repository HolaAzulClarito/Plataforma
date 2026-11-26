import { Hono } from "hono";
import { z } from "zod";
import { v } from "../../lib/http";
import { IdParam, required } from "../../lib/schemas";
import { createPage, listPages, publishPage, updatePage } from "./service";

const PageUrl = z
  .string()
  .max(120)
  .regex(/^\/([a-z0-9-]+\/)*$/);
const Blocks = z.array(required(60)).min(1).max(30);

export const paginasAdmin = new Hono()
  .get("/paginas", async (c) => c.json(await listPages()))
  .post("/paginas", v("json", z.object({ titulo: required(120), url: PageUrl, bloques: Blocks.optional() })), async (c) => c.json(await createPage(c.req.valid("json")), 201))
  .patch(
    "/paginas/:id",
    v("param", IdParam),
    v(
      "json",
      z.object({
        titulo: required(120).optional(),
        url: PageUrl.optional(),
        bloques: Blocks.optional(),
        seo: z.object({ titulo: required(120), descripcion: required(300), idioma: z.enum(["es", "en"]) }).optional(),
      }),
    ),
    async (c) => c.json(await updatePage(c.req.valid("param").id, c.req.valid("json"))),
  )
  .post("/paginas/:id/publicar", v("param", IdParam), async (c) => c.json(await publishPage(c.req.valid("param").id)));
