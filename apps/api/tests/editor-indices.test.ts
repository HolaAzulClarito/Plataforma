/* Hallazgos 7 y 12 del dictamen de QA: borrar módulo y proteger los índices posicionales del avance y de los intentos. */
import { describe, expect, it } from "vitest";
import { admin, mvz, useDemo } from "./helpers";

useDemo();

const VID = "12345/0f8fad5b-d9cb-469f-a165-70867728950e";

const create = async (modulos = [{ nombre: "Fundamentos", lecciones: 2 }, { nombre: "Casos", lecciones: 1 }]) =>
  (
    await admin.post("/editor/cursos", {
      titulo: "Curso de índices",
      tituloEn: "Index course",
      tipo: "Curso",
      categoria: "Curso independiente",
      instructor: "Ponente",
      nivel: "Intermedio",
      precioRegular: 0,
      precio: 0,
      modulos,
    })
  ).body.curso as { id: string; slug: string };

const publish = async (id: string) => {
  const c = (await admin.get(`/editor/cursos/${id}`)).body.curso;
  for (const [mi, m] of c.modulos.entries())
    for (const li of m.lecciones.keys()) await admin.patch(`/editor/cursos/${id}/modulos/${mi}/lecciones/${li}`, { video: VID, dur: "10:00" });
  for (const k of [0, 1]) {
    await admin.post(`/editor/cursos/${id}/examen/preguntas`, { tipo: "om" });
    await admin.put(`/editor/cursos/${id}/examen/preguntas/${k}`, { tipo: "om", texto: `P${k}`, opciones: ["A", "B"], correctas: [0] });
  }
  expect((await admin.post(`/editor/cursos/${id}/publicar`)).status).toBe(200);
};

describe("DELETE /api/admin/editor/cursos/:id/modulos/:mi", () => {
  it("borra un módulo y sus lecciones", async () => {
    const c = await create();
    const r = await admin.del(`/editor/cursos/${c.id}/modulos/1`);
    expect(r.status).toBe(200);
    expect(r.body.curso.modulos).toHaveLength(1);
    expect(r.body.curso.modulos[0].nombre).toBe("Fundamentos");
  });

  it("409 si el curso se queda sin lecciones; 404 si el módulo no existe", async () => {
    const c = await create([{ nombre: "Único", lecciones: 2 }]);
    const r = await admin.del(`/editor/cursos/${c.id}/modulos/0`);
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/sin lecciones/);
    expect((await admin.del(`/editor/cursos/${c.id}/modulos/5`)).status).toBe(404);
  });

  it("un módulo vacío se puede borrar aunque haya avance", async () => {
    const c = await create();
    await publish(c.id);
    /* El módulo nuevo nace con una lección: se vacía antes de que haya avance. */
    await admin.post(`/editor/cursos/${c.id}/modulos`, { nombre: "Vacío" });
    expect((await admin.del(`/editor/cursos/${c.id}/modulos/2/lecciones/0`)).status).toBe(200);
    await mvz.post("/inscripciones", { curso: c.slug });
    await mvz.post(`/cursos/${c.slug}/lecciones/0/avance`, { pct: 100 });
    expect((await admin.del(`/editor/cursos/${c.id}/modulos/2`)).status).toBe(200);
  });
});

describe("Índices posicionales: lecciones con alumnos con avance", () => {
  const withProgress = async () => {
    const c = await create();
    await publish(c.id);
    await mvz.post("/inscripciones", { curso: c.slug });
    await mvz.post(`/cursos/${c.slug}/lecciones/1/avance`, { pct: 100 });
    return c;
  };

  it("bloquea borrar o mover lecciones existentes y borrar módulos con lecciones (409 con mensaje claro)", async () => {
    const c = await withProgress();
    const del = await admin.del(`/editor/cursos/${c.id}/modulos/0/lecciones/0`);
    expect(del.status).toBe(409);
    expect(del.body.error).toMatch(/alumnos con avance/);
    expect((await admin.post(`/editor/cursos/${c.id}/modulos/0/lecciones/1/mover`, { dir: -1 })).status).toBe(409);
    expect((await admin.del(`/editor/cursos/${c.id}/modulos/0`)).status).toBe(409);
    /* Agregar en un módulo intermedio movería los índices de los siguientes. */
    expect((await admin.post(`/editor/cursos/${c.id}/modulos/0/lecciones`, {})).status).toBe(409);
  });

  it("permite agregar al final (último módulo o módulo nuevo) y editar datos", async () => {
    const c = await withProgress();
    expect((await admin.post(`/editor/cursos/${c.id}/modulos/1/lecciones`, { titulo: "Nueva" })).status).toBe(201);
    expect((await admin.post(`/editor/cursos/${c.id}/modulos`, { nombre: "Extra" })).status).toBe(201);
    expect((await admin.patch(`/editor/cursos/${c.id}/modulos/0/lecciones/0`, { titulo: "Renombrada" })).status).toBe(200);
    const p = (await mvz.get(`/cursos/${c.slug}/progreso`)).body;
    expect(p.lecciones[1].hecha).toBe(true);
  });

  it("sin avance se puede borrar y mover libremente", async () => {
    const c = await create();
    await publish(c.id);
    expect((await admin.post(`/editor/cursos/${c.id}/modulos/0/lecciones/1/mover`, { dir: -1 })).status).toBe(200);
    expect((await admin.del(`/editor/cursos/${c.id}/modulos/0/lecciones/0`)).status).toBe(200);
  });
});

describe("Índices posicionales: preguntas con intentos o sesiones abiertas", () => {
  const withSession = async () => {
    const c = await create([{ nombre: "M1", lecciones: 1 }]);
    await publish(c.id);
    await mvz.post("/inscripciones", { curso: c.slug });
    await mvz.post(`/cursos/${c.slug}/lecciones/0/avance`, { pct: 100 });
    expect((await mvz.post(`/cursos/${c.slug}/examen/iniciar`)).status).toBe(200);
    return c;
  };

  it("bloquea borrar preguntas o cambiarlas entre calificable y no calificable", async () => {
    const c = await withSession();
    const d = await admin.del(`/editor/cursos/${c.id}/examen/preguntas/0`);
    expect(d.status).toBe(409);
    expect(d.body.error).toMatch(/intentos o sesiones abiertas/);
    expect((await admin.put(`/editor/cursos/${c.id}/examen/preguntas/1`, { tipo: "ab", texto: "Abierta" })).status).toBe(409);
  });

  it("permite corregir el texto y agregar preguntas al final", async () => {
    const c = await withSession();
    expect((await admin.put(`/editor/cursos/${c.id}/examen/preguntas/0`, { tipo: "om", texto: "P0 corregida", opciones: ["A", "B"], correctas: [0] })).status).toBe(200);
    expect((await admin.post(`/editor/cursos/${c.id}/examen/preguntas`, { tipo: "vf" })).status).toBe(201);
  });

  it("sin intentos se puede borrar", async () => {
    const c = await create([{ nombre: "M1", lecciones: 1 }]);
    await publish(c.id);
    expect((await admin.del(`/editor/cursos/${c.id}/examen/preguntas/0`)).status).toBe(200);
  });
});
