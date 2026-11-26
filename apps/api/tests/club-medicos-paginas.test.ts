import { describe, expect, it } from "vitest";
import { admin, get, mvz, useDemo } from "./helpers";
import { db } from "../src/store";

useDemo();

describe("Club MVZ", () => {
  it("reglas y premios públicos; saldo del médico", async () => {
    expect((await get("/api/club/reglas")).body.map((r: { id: string; puntos: number }) => [r.id, r.puntos])).toEqual([
      ["cedula", 200],
      ["webinar", 50],
      ["curso", 300],
      ["leccion", 20],
    ]);
    expect((await get("/api/club/premios")).body).toHaveLength(4);
    expect((await mvz.get("/puntos")).body).toMatchObject({ saldo: 1240, canjeados: [] });
  });

  it("canje con saldo suficiente, una sola vez", async () => {
    const r = await mvz.post("/canjes", { premio: "webinar-vip" });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ saldo: 740, inscripcion: null });
    expect((await mvz.post("/canjes", { premio: "webinar-vip" })).status).toBe(409);
    const p = await mvz.get("/puntos");
    expect(p.body.canjeados).toEqual(["webinar-vip"]);
    expect(p.body.movimientos[0]).toMatchObject({ puntos: -500 });
  });

  it("sin puntos suficientes o con el curso ya inscrito responde 409", async () => {
    expect((await mvz.post("/canjes", { premio: "promo-3x2" })).status).toBe(409);
    db().puntos["Dra. Laura Méndez"] = 5000;
    expect((await mvz.post("/canjes", { premio: "oftalmologia" })).status).toBe(409);
  });

  it("canjear un curso crea una inscripción aprobada", async () => {
    db().puntos["Dra. Laura Méndez"] = 5000;
    db().premios.push({ id: "odontologia", nombre: "Temas selectos de odontología", puntos: 1000, icono: "graduation-cap" });
    const r = await mvz.post("/canjes", { premio: "odontologia" });
    expect(r.body.inscripcion).toMatchObject({ s: "odontologia", st: "approved", por: "Canje Club MVZ" });
    expect((await mvz.get("/cursos/odontologia/progreso")).status).toBe(200);
  });

  it("premio inexistente 404 y id inválido 400", async () => {
    expect((await mvz.post("/canjes", { premio: "no-existe" })).status).toBe(404);
    expect((await mvz.post("/canjes", { premio: "<b>" })).status).toBe(400);
  });

  it("admin cambia reglas y administra premios", async () => {
    expect((await admin.put("/club/reglas/cedula", { puntos: 250 })).body.puntos).toBe(250);
    expect((await admin.put("/club/reglas/otra", { puntos: 1 })).status).toBe(400);
    expect((await admin.put("/club/reglas/cedula", { puntos: -5 })).status).toBe(400);
    const p = await admin.post("/club/premios", { nombre: "Diplomado de ejemplo", puntos: 2500 });
    expect(p.status).toBe(201);
    expect(p.body.id).toMatch(/^rw-\d+$/);
    expect((await admin.del(`/club/premios/${p.body.id}`)).status).toBe(204);
    expect((await admin.del(`/club/premios/${p.body.id}`)).status).toBe(404);
  });
});

describe("Médicos: verificación de cédulas", () => {
  it("aprueba una cédula, suma puntos al médico y no repite", async () => {
    const l = await admin.get("/medicos/verificaciones");
    expect(l.body).toHaveLength(3);
    const r = await admin.post(`/medicos/verificaciones/${l.body[1].id}/aprobar`);
    expect(r.body.verificado).toBe(true);
    expect(db().puntos["MVZ Paola Ruiz"]).toBe(200);
    expect((await admin.post(`/medicos/verificaciones/${l.body[1].id}/aprobar`)).status).toBe(409);
    expect((await admin.post("/medicos/verificaciones/99/aprobar")).status).toBe(404);
    expect((await admin.get("/tablero")).body.cedulasPendientes).toBe(2);
  });
});

describe("Páginas", () => {
  it("lista, crea, edita y publica", async () => {
    expect((await admin.get("/paginas")).body).toHaveLength(4);
    const c = await admin.post("/paginas", { titulo: "Promociones", url: "/promociones/" });
    expect(c.status).toBe(201);
    expect(c.body.estado).toBe("Borrador");
    const e = await admin.patch(`/paginas/${c.body.id}`, { bloques: ["Héroe", "Galería"], seo: { titulo: "Promos · Kirón", descripcion: "Promociones vigentes", idioma: "es" } });
    expect(e.body.bloques).toEqual(["Héroe", "Galería"]);
    expect((await admin.post(`/paginas/${c.body.id}/publicar`)).body.estado).toBe("Publicada");
  });

  it("URL repetida 409, URL inválida 400 y página inexistente 404", async () => {
    expect((await admin.post("/paginas", { titulo: "Otra", url: "/productos/" })).status).toBe(409);
    expect((await admin.post("/paginas", { titulo: "Otra", url: "javascript:alert(1)" })).status).toBe(400);
    expect((await admin.post("/paginas/99/publicar")).status).toBe(404);
  });
});
