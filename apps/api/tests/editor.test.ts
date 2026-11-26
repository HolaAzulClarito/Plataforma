import { describe, expect, it } from "vitest";
import { admin, get, mvz, useDemo } from "./helpers";

useDemo();

const VID = "https://iframe.mediadelivery.net/embed/12345/0f8fad5b-d9cb-469f-a165-70867728950e";

const nuevo = {
  titulo: "Medicina interna felina",
  tituloEn: "Feline internal medicine",
  tipo: "Curso",
  categoria: "Curso independiente",
  instructor: "Ponente de ejemplo",
  nivel: "Intermedio",
  precioRegular: 0,
  precio: 0,
  modulos: [
    { nombre: "Fundamentos", lecciones: 2 },
    { nombre: "Casos clínicos", lecciones: 1 },
  ],
};

const create = async () => (await admin.post("/editor/cursos", nuevo)).body.curso;

/* Completa video y duración de cada lección y agrega una pregunta de opción múltiple. */
const complete = async (id: string) => {
  const c = (await admin.get(`/editor/cursos/${id}`)).body.curso;
  for (const [mi, m] of c.modulos.entries())
    for (const li of m.lecciones.keys()) await admin.patch(`/editor/cursos/${id}/modulos/${mi}/lecciones/${li}`, { video: VID, dur: "12:40" });
  await admin.post(`/editor/cursos/${id}/examen/preguntas`, { tipo: "om" });
  await admin.put(`/editor/cursos/${id}/examen/preguntas/0`, { tipo: "om", texto: "¿Cuál es correcta?", opciones: ["A", "B", "C"], correctas: [1] });
};

describe("Editor de cursos nuevos", () => {
  it("crea el curso en borrador con módulos, lecciones y un examen final", async () => {
    const r = await admin.post("/editor/cursos", nuevo);
    expect(r.status).toBe(201);
    expect(r.body.curso).toMatchObject({ estado: "borrador", slug: "medicina-interna-felina", fecha: "26/11/2026" });
    expect(r.body.curso.modulos.map((m: { lecciones: unknown[] }) => m.lecciones.length)).toEqual([2, 1]);
    expect(r.body.curso.examen).toMatchObject({ titulo: "Examen final", aprobatoria: 80, preguntas: [] });
    expect(r.body.pendientes.length).toBeGreaterThan(0);
    expect((await admin.get("/cursos")).body.items[0]).toMatchObject({ key: `n:${r.body.curso.id}`, nuevo: true, lecciones: 3 });
  });

  it("valida precios, módulos y datos", async () => {
    expect((await admin.post("/editor/cursos", { ...nuevo, precioRegular: 100, precio: 200 })).status).toBe(400);
    expect((await admin.post("/editor/cursos", { ...nuevo, modulos: [] })).status).toBe(400);
    expect((await admin.post("/editor/cursos", { ...nuevo, modulos: [{ nombre: "M", lecciones: 61 }] })).status).toBe(400);
    expect((await admin.post("/editor/cursos", { ...nuevo, precio: 1.5 })).status).toBe(400);
    expect((await admin.post("/editor/cursos", { ...nuevo, titulo: "" })).status).toBe(400);
  });

  it("no publica con pendientes y publica al completarlo", async () => {
    const c = await create();
    const p = await admin.post(`/editor/cursos/${c.id}/publicar`);
    expect(p.status).toBe(409);
    expect(p.body.pendientes.length).toBeGreaterThan(0);
    const pedir = await admin.patch(`/editor/cursos/${c.id}`, { estado: "publicado", descripcion: "<p>Hola</p>" });
    expect(pedir.body.curso.estado).toBe("borrador");
    await complete(c.id);
    const ok = await admin.post(`/editor/cursos/${c.id}/publicar`);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ curso: { estado: "publicado" }, pendientes: [] });
    const pub = await get(`/api/cursos/${c.slug}`);
    expect(pub.body).toMatchObject({ origen: "editor", tipo: "Curso", instructor: "Ponente de ejemplo" });
    expect(pub.body.temario[0]).toMatchObject({ titulo: "Lección 1", duracion: "12:40" });
    expect((await get("/api/cursos")).body.some((x: { slug: string }) => x.slug === c.slug)).toBe(true);
  });

  it("un curso publicado del editor funciona de punta a punta: lecciones, examen y constancia", async () => {
    const c = await create();
    await complete(c.id);
    await admin.post(`/editor/cursos/${c.id}/publicar`);
    expect((await mvz.post("/inscripciones", { curso: c.slug })).body.st).toBe("approved");
    for (const i of [0, 1, 2]) await mvz.post(`/cursos/${c.slug}/lecciones/${i}/avance`, { pct: 100 });
    const ses = (await mvz.post(`/cursos/${c.slug}/examen/iniciar`)).body;
    expect(ses.preguntas).toEqual([{ i: 0, t: "om", q: "¿Cuál es correcta?", o: ["A", "B", "C"] }]);
    const r = await mvz.post(`/cursos/${c.slug}/examen/intentos`, { sesion: ses.id, respuestas: [{ i: 0, v: [1] }] });
    expect(r.body.intento.ok).toBe(true);
    expect(r.body.constancia.tipo).toBe("curso");
  });

  it("valida video de Bunny y duración; limpia la descripción HTML", async () => {
    const c = await create();
    expect((await admin.patch(`/editor/cursos/${c.id}/modulos/0/lecciones/0`, { video: "https://youtube.com/x" })).status).toBe(400);
    expect((await admin.patch(`/editor/cursos/${c.id}/modulos/0/lecciones/0`, { dur: "12m" })).status).toBe(400);
    const ok = await admin.patch(`/editor/cursos/${c.id}/modulos/0/lecciones/0`, { video: `12345/0F8FAD5B-D9CB-469F-A165-70867728950E` });
    expect(ok.body.curso.modulos[0].lecciones[0].video).toEqual({ lib: "12345", vid: "0f8fad5b-d9cb-469f-a165-70867728950e" });
    const d = await admin.patch(`/editor/cursos/${c.id}`, { descripcion: `<p onclick="x()">Hola <script>alert(1)</script><a href="javascript:alert(1)">a</a></p>` });
    expect(d.body.curso.descripcion).toBe("<p>Hola <a>a</a></p>");
    expect((await admin.patch(`/editor/cursos/${c.id}`, { estado: "programado", fechaProg: "2026-01-01" })).status).toBe(400);
  });

  it("módulos, lecciones, adjuntos y orden", async () => {
    const c = await create();
    expect((await admin.post(`/editor/cursos/${c.id}/modulos`, { nombre: "Cierre clínico" })).body.curso.modulos).toHaveLength(3);
    await admin.patch(`/editor/cursos/${c.id}/modulos/0`, { nombre: "Bases" });
    const l = await admin.post(`/editor/cursos/${c.id}/modulos/0/lecciones`, { titulo: "Lección extra" });
    expect(l.body.curso.modulos[0].lecciones).toHaveLength(3);
    const m = await admin.post(`/editor/cursos/${c.id}/modulos/0/lecciones/2/mover`, { dir: -1 });
    expect(m.body.curso.modulos[0].lecciones[1].titulo).toBe("Lección extra");
    expect((await admin.post(`/editor/cursos/${c.id}/modulos/0/lecciones/0/mover`, { dir: -1 })).status).toBe(409);
    expect((await admin.post(`/editor/cursos/${c.id}/modulos/0/lecciones/0/adjuntos`, { nombre: "guia.pdf", tam: 1024 })).status).toBe(201);
    expect((await admin.post(`/editor/cursos/${c.id}/modulos/0/lecciones/0/adjuntos`, { nombre: "virus.exe", tam: 1024 })).status).toBe(400);
    expect((await admin.del(`/editor/cursos/${c.id}/modulos/0/lecciones/0/adjuntos/0`)).body.curso.modulos[0].lecciones[0].adjuntos).toEqual([]);
    expect((await admin.del(`/editor/cursos/${c.id}/modulos/0/lecciones/1`)).body.curso.modulos[0].lecciones).toHaveLength(2);
    expect((await admin.get(`/editor/cursos/ffff`)).status).toBe(404);
  });

  it("examen: reglas, banco de preguntas, exportar e importar", async () => {
    const c = await create();
    expect((await admin.patch(`/editor/cursos/${c.id}/examen`, { intentos: 3, tiempo: 45 })).body.curso.examen).toMatchObject({ intentos: 3, tiempo: 45 });
    expect((await admin.patch(`/editor/cursos/${c.id}/examen`, { retro: "revelar" })).status).toBe(400);
    const b = await admin.post(`/editor/cursos/${c.id}/examen/banco`, { ids: [1, 2] });
    expect(b.body.curso.examen.preguntas.map((q: { tipo: string }) => q.tipo)).toEqual(["om", "vf"]);
    expect((await admin.get("/academia/banco")).body.find((q: { id: number }) => q.id === 1).usos).toBe(4);
    const exp = (await admin.get(`/editor/cursos/${c.id}/examen/exportar`)).body;
    expect(exp).toMatchObject({ formato: "kiron-examen", version: 1, ajustes: { intentos: 3 } });
    const imp = await admin.post(`/editor/cursos/${c.id}/examen/importar`, exp);
    expect(imp.body.curso.examen.preguntas).toHaveLength(4);
    expect((await admin.post(`/editor/cursos/${c.id}/examen/importar`, { formato: "otro", version: 1, preguntas: [] })).status).toBe(400);
    expect((await admin.del(`/editor/cursos/${c.id}/examen/preguntas/0`)).body.curso.examen.preguntas).toHaveLength(3);
  });

  it("normaliza las respuestas correctas de la pregunta", async () => {
    const c = await create();
    await admin.post(`/editor/cursos/${c.id}/examen/preguntas`, { tipo: "om" });
    const r = await admin.put(`/editor/cursos/${c.id}/examen/preguntas/0`, { tipo: "om", texto: "P", opciones: ["A", "B"], correctas: [1, 0, 5] });
    expect(r.body.curso.examen.preguntas[0].correctas).toEqual([1]);
  });
});
