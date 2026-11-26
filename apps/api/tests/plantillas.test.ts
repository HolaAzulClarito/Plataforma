import { describe, expect, it } from "vitest";
import { admin, mvz, useDemo } from "./helpers";

useDemo();

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

describe("Plantillas de constancia", () => {
  it("lista y crea plantillas en borrador", async () => {
    const l = await admin.get("/academia/plantillas");
    expect(l.body.map((t: { id: string }) => t.id)).toEqual(["c1", "c2", "c3"]);
    const n = await admin.post("/academia/plantillas", { nombre: "Constancia especial" });
    expect(n.status).toBe(201);
    expect(n.body).toMatchObject({ id: "c4", estado: "draft", tieneImagen: false });
  });

  it("mueve variables dentro de los límites y cambia tamaños", async () => {
    const r = await admin.patch("/academia/plantillas/c1", { vars: { nombre: { x: 99.99, y: 1 }, qr: { size: 500 } } });
    expect(r.status).toBe(400);
    const ok = await admin.patch("/academia/plantillas/c1", { vars: { nombre: { x: 99.94, y: 1, on: false }, qr: { size: 200 } } });
    expect(ok.body.vars.nombre).toMatchObject({ x: 98, y: 3, on: false });
    expect(ok.body.vars.qr.size).toBe(160);
  });

  it("asociar un curso lo quita de las demás plantillas", async () => {
    await admin.patch("/academia/plantillas/c3", { cursos: ["kiroftal-2"], estado: "published" });
    const l = (await admin.get("/academia/plantillas")).body;
    expect(l.find((t: { id: string }) => t.id === "c2").cursos).not.toContain("kiroftal-2");
    expect((await admin.patch("/academia/plantillas/c3", { cursos: ["no-existe"] })).status).toBe(404);
  });

  it("sube y quita la imagen base validando tipo", async () => {
    expect((await admin.put("/academia/plantillas/c1/imagen", { imagen: PNG })).body.tieneImagen).toBe(true);
    expect((await admin.get("/academia/plantillas/c1")).body.imagen).toBe(PNG);
    expect((await admin.put("/academia/plantillas/c1/imagen", { imagen: "data:text/html;base64,PGI+" })).status).toBe(400);
    expect((await admin.del("/academia/plantillas/c1/imagen")).body.tieneImagen).toBe(false);
    expect((await admin.get("/academia/plantillas/c9")).status).toBe(404);
  });

  it("una constancia emitida conserva la plantilla con que se emitió", async () => {
    await mvz.post("/inscripciones", { curso: "simposio-parasitologia-cardiologia" });
    const ses = (await mvz.post("/cursos/simposio-parasitologia-cardiologia/examen/iniciar")).body;
    const { db } = await import("../src/store");
    const respuestas = ses.preguntas.map((p: { i: number }) => ({ i: p.i, v: db().examenEjemplo[p.i]!.c }));
    const r = await mvz.post("/cursos/simposio-parasitologia-cardiologia/examen/intentos", { sesion: ses.id, respuestas });
    const folio = r.body.constancia.folio;
    await admin.patch("/academia/plantillas/c2", { nombre: "Nombre cambiado", vars: { nombre: { x: 10 } } });
    const d = await mvz.get(`/constancias/${folio}`);
    expect(d.body.plantilla).toMatchObject({ id: "c2", nombre: "Constancia de curso" });
    expect(d.body.plantilla.vars.nombre.x).toBe(50);
  });
});
