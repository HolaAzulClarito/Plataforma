import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { env } from "./env";

/* Los módulos de negocio (productos, cursos, inscripciones, exámenes, constancias, webinars,
   club, médicos, páginas) se registran aquí en la tarea 4. */
export const app = new Hono()
  .use("*", secureHeaders())
  .use("/api/*", cors({ origin: env.ALLOWED_ORIGINS, credentials: true }))
  .get("/api/health", (c) => c.json({ ok: true, version: "2.5.0" }))
  .notFound((c) => c.json({ error: "No encontrado" }, 404))
  .onError((err, c) => {
    console.error(err); // En producción: Sentry.
    return c.json({ error: "Error interno" }, 500);
  });

export type AppType = typeof app;
