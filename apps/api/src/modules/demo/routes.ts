/* Sesión simulada y reinicio de datos del demo (ADR-003). */
import { Hono } from "hono";
import { DEMO_ADMIN, DEMO_USER, type MeResponse } from "@kiron/shared";
import type { RoleVars } from "../../lib/demo-role";
import { env } from "../../env";
import { resetStore } from "../../store";
import { balanceOf } from "../club/service";

export const demoPublic = new Hono<RoleVars>()
  .get("/sesion", (c) => {
    const role = c.get("role");
    if (!role) return c.json({ error: "Inicia sesión para continuar" }, 401);
    const body: MeResponse =
      role === "admin" ? { rol: role, usuario: { ...DEMO_ADMIN }, puntos: null } : { rol: role, usuario: { ...DEMO_USER }, puntos: balanceOf(DEMO_USER.name) };
    return c.json(body);
  })
  /* Restaura todos los datos semilla. No existe en producción. */
  .post("/demo/reset", (c) => {
    if (env.NODE_ENV === "production") return c.json({ error: "No encontrado" }, 404);
    resetStore();
    return c.json({ ok: true });
  });
