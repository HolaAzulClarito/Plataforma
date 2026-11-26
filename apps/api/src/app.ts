import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { DEMO_ROLE_HEADER } from "@kiron/shared";
import { env } from "./env";
import { HttpError } from "./lib/http";
import { readRole, requireRole, type RoleVars } from "./lib/demo-role";
import { academiaAdmin } from "./modules/academia/routes";
import { catalogoPublic } from "./modules/catalogo/routes";
import { clubAdmin, clubMe, clubPublic } from "./modules/club/routes";
import { constanciasMe, constanciasPublic } from "./modules/constancias/routes";
import { cursosAdmin, cursosPublic } from "./modules/cursos/routes";
import { demoPublic } from "./modules/demo/routes";
import { editorAdmin } from "./modules/editor/routes";
import { examenesAdmin, examenesMe } from "./modules/examenes/routes";
import { inscripcionesAdmin, inscripcionesMe } from "./modules/inscripciones/routes";
import { medicosAdmin } from "./modules/medicos/routes";
import { paginasAdmin } from "./modules/paginas/routes";
import { plantillasAdmin } from "./modules/plantillas/routes";
import { progresoMe } from "./modules/progreso/routes";
import { tableroAdmin } from "./modules/tablero/routes";
import { webinarsAdmin, webinarsMe, webinarsPublic } from "./modules/webinars/routes";

/* Prefijos: /api (público), /api/me (rol mvz: el médico de demo) y /api/admin (rol admin). Ver packages/shared/src/api.ts. */
export const app = new Hono<RoleVars>()
  .use("*", secureHeaders())
  .use("/api/*", cors({ origin: env.ALLOWED_ORIGINS, credentials: true, allowHeaders: ["Content-Type", DEMO_ROLE_HEADER] }))
  /* Las imágenes van como data URL (hasta 3 MB); 5 MB cubre el base64 con margen. */
  .use("/api/*", bodyLimit({ maxSize: 5 * 1024 * 1024, onError: (c) => c.json({ error: "El contenido es demasiado grande" }, 413) }))
  .use("/api/*", readRole)
  .use("/api/me/*", requireRole("mvz"))
  .use("/api/admin/*", requireRole("admin"))
  .get("/api/health", (c) => c.json({ ok: true, version: "2.5.0" }))
  /* Público */
  .route("/api", demoPublic)
  .route("/api", catalogoPublic)
  .route("/api", cursosPublic)
  .route("/api", webinarsPublic)
  .route("/api", constanciasPublic)
  .route("/api", clubPublic)
  /* Médico */
  .route("/api/me", inscripcionesMe)
  .route("/api/me", progresoMe)
  .route("/api/me", examenesMe)
  .route("/api/me", constanciasMe)
  .route("/api/me", webinarsMe)
  .route("/api/me", clubMe)
  /* Administración */
  .route("/api/admin", cursosAdmin)
  .route("/api/admin", inscripcionesAdmin)
  .route("/api/admin", examenesAdmin)
  .route("/api/admin", academiaAdmin)
  .route("/api/admin", plantillasAdmin)
  .route("/api/admin", editorAdmin)
  .route("/api/admin", webinarsAdmin)
  .route("/api/admin", clubAdmin)
  .route("/api/admin", medicosAdmin)
  .route("/api/admin", paginasAdmin)
  .route("/api/admin", tableroAdmin)
  .notFound((c) => c.json({ error: "No encontrado" }, 404))
  .onError((err, c) => {
    if (err instanceof HttpError) return c.json({ error: err.message, ...err.extra }, err.status);
    /* JSON mal formado y otros errores del framework: se responde sin reflejar el contenido recibido. */
    if (err instanceof HTTPException) return c.json({ error: err.status === 400 ? "Solicitud inválida" : "Error en la solicitud" }, err.status);
    console.error(err); // En producción: Sentry.
    return c.json({ error: "Error interno" }, 500);
  });

export type AppType = typeof app;
