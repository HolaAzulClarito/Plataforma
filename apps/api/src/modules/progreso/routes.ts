import { Hono } from "hono";
import { z } from "zod";
import { DEMO_USER } from "@kiron/shared";
import { v } from "../../lib/http";
import { slug, SlugParam } from "../../lib/schemas";
import { getProgress, myCourses, reportLesson } from "./service";

const ME = DEMO_USER.name;

const LessonParam = z.object({ slug, i: z.coerce.number().int().min(0).max(999) });

export const progresoMe = new Hono()
  .get("/cursos", async (c) => c.json(await myCourses(ME)))
  .get("/cursos/:slug/progreso", v("param", SlugParam), async (c) => c.json(await getProgress(ME, c.req.valid("param").slug)))
  .post("/cursos/:slug/lecciones/:i/avance", v("param", LessonParam), v("json", z.object({ pct: z.number().min(0).max(100) })), async (c) => {
    const p = c.req.valid("param");
    return c.json(await reportLesson(ME, p.slug, p.i, c.req.valid("json").pct));
  });
