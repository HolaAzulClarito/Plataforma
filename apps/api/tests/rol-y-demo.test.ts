import { describe, expect, it } from "vitest";
import { admin, call, get, mvz, useDemo } from "./helpers";

useDemo();

describe("Rol de demo (X-Demo-Role)", () => {
  it("sin rol, las rutas del médico responden 401", async () => {
    expect((await get("/api/me/cursos")).status).toBe(401);
    expect((await call("POST", "/api/me/canjes", { body: { premio: "webinar-vip" } })).status).toBe(401);
  });

  it("un rol inválido se trata como sin sesión", async () => {
    expect((await call("GET", "/api/me/cursos", { role: "root" })).status).toBe(401);
  });

  it("el rol mvz en una ruta de administración responde 403", async () => {
    expect((await call("GET", "/api/admin/inscripciones", { role: "mvz" })).status).toBe(403);
    expect((await call("PATCH", "/api/admin/academia/ajustes", { role: "mvz", body: { ocultar: false } })).status).toBe(403);
  });

  it("el rol admin no actúa como el médico de demo", async () => {
    expect((await call("GET", "/api/me/cursos", { role: "admin" })).status).toBe(403);
  });

  it("sin rol, la administración responde 401", async () => {
    expect((await get("/api/admin/tablero")).status).toBe(401);
  });

  it("GET /api/sesion devuelve el usuario de demo según el rol", async () => {
    expect((await get("/api/sesion")).status).toBe(401);
    const m = await get("/api/sesion", "mvz");
    expect(m.body).toMatchObject({ rol: "mvz", usuario: { name: "Dra. Laura Méndez" }, puntos: 1240 });
    expect((await get("/api/sesion", "admin")).body).toMatchObject({ rol: "admin", puntos: null });
  });
});

describe("POST /api/demo/reset", () => {
  it("restaura los datos semilla", async () => {
    await mvz.post("/canjes", { premio: "webinar-vip" });
    await admin.post("/academia/grupos", { nombre: "Grupo temporal" });
    expect((await mvz.get("/puntos")).body.saldo).toBe(740);
    const r = await call("POST", "/api/demo/reset");
    expect(r.status).toBe(200);
    expect((await mvz.get("/puntos")).body.saldo).toBe(1240);
    expect((await admin.get("/academia/grupos")).body).toHaveLength(3);
  });
});
