import { createMiddleware } from "hono/factory";
import { DEMO_ROLE_HEADER, type Role } from "@kiron/shared";

/* Login simulado (ADR-003): el rol viaja en un encabezado de demo. NO es un mecanismo de seguridad. */
export type RoleVars = { Variables: { role: Role | null } };

const parse = (h: string | undefined): Role | null | "invalido" =>
  h === undefined || h === "" ? null : h === "mvz" || h === "admin" ? h : "invalido";

/* Lee el rol si viene; no exige nada. */
export const readRole = createMiddleware<RoleVars>(async (c, next) => {
  const r = parse(c.req.header(DEMO_ROLE_HEADER));
  c.set("role", r === "invalido" ? null : r);
  await next();
});

/* Exige un rol: sin rol 401; con otro rol 403. */
export const requireRole = (role: Role) =>
  createMiddleware<RoleVars>(async (c, next) => {
    const r = parse(c.req.header(DEMO_ROLE_HEADER));
    if (r === null || r === "invalido") return c.json({ error: "Inicia sesión para continuar" }, 401);
    if (r !== role) return c.json({ error: "No tienes permiso para esta acción" }, 403);
    c.set("role", r);
    await next();
  });
