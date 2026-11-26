import { describe, expect, it } from "vitest";
import { call, get, useDemo } from "./helpers";

useDemo();

describe("Catálogo y red comercial (público)", () => {
  it("lista categorías y productos reales", async () => {
    expect((await get("/api/categorias")).body).toHaveLength(19);
    const p = await get("/api/productos");
    expect(p.status).toBe(200);
    expect(p.body).toHaveLength(112);
  });

  it("el detalle de producto trae sus relacionados declarados", async () => {
    const r = await get("/api/productos/spirocard-duo-10");
    expect(r.status).toBe(200);
    expect(r.body.product.reg).toBe("Q-0790-188");
    expect(r.body.related.map((p: { slug: string }) => p.slug)).toContain("cardiobendan-5-mg");
  });

  it("sin relacionados declarados usa hasta 4 de la misma categoría", async () => {
    const r = await get("/api/productos/vibix-rabia");
    expect(r.body.related.length).toBeLessThanOrEqual(4);
    expect(r.body.related.every((p: { cat: string }) => p.cat === "Biológicos")).toBe(true);
  });

  it("producto inexistente responde 404 y slug inválido 400", async () => {
    expect((await get("/api/productos/no-existe")).status).toBe(404);
    const bad = await get("/api/productos/Mal%20Slug");
    expect(bad.status).toBe(400);
    expect(bad.text).not.toContain("Mal Slug");
  });

  it("representantes, distribuidores, países y videos", async () => {
    const reps = await get("/api/representantes");
    expect(reps.body.zonas).toHaveLength(4);
    expect(reps.body.nacionales).toHaveLength(3);
    expect((await get("/api/distribuidores")).body.length).toBeGreaterThan(0);
    expect((await get("/api/paises")).body.proximamente).toEqual(["Ecuador", "Perú"]);
    expect((await get("/api/videos")).body).toHaveLength(16);
  });

  it("el próximo webinar trae startsAt con zona horaria", async () => {
    const r = await get("/api/webinars/proximo");
    expect(r.body.startsAt).toBe("2026-12-15T20:00:00-06:00");
    expect(r.body.title).toBeTruthy();
  });

  it("JSON mal formado responde 400 sin reflejar el contenido", async () => {
    const r = await call("POST", "/api/me/inscripciones", { role: "mvz" });
    expect(r.status).toBe(400);
  });

  it("rutas desconocidas responden 404 en JSON", async () => {
    const r = await get("/api/no-existe");
    expect(r.status).toBe(404);
    expect(r.body.error).toBeTruthy();
  });
});
