import { describe, expect, it } from "vitest";
import { admin, mvz, useDemo } from "./helpers";

useDemo();

describe("Progreso de lecciones", () => {
  it("mis cursos muestra avance, intentos y constancia", async () => {
    const r = await mvz.get("/cursos");
    expect(r.status).toBe(200);
    const inm = r.body.cursos.find((c: { course: { slug: string } }) => c.course.slug === "inmunologia");
    expect(inm).toMatchObject({ pct: 100, examen: "aprobado", notaFinal: 9.3, constancia: "KI-2026-001234" });
    const oft = r.body.cursos.find((c: { course: { slug: string } }) => c.course.slug === "oftalmologia");
    expect(oft).toMatchObject({ hechas: 12, total: 31, examen: "bloqueado", intentosMax: 2 });
  });

  it("sin inscripción aprobada no hay acceso al curso", async () => {
    expect((await mvz.get("/cursos/kiroftal-2/progreso")).status).toBe(403);
    await mvz.post("/inscripciones", { curso: "diplomado-integral" });
    expect((await mvz.get("/cursos/diplomado-integral/progreso")).status).toBe(403);
    expect((await mvz.post("/cursos/diplomado-integral/lecciones/0/avance", { pct: 100 })).status).toBe(403);
    expect((await mvz.get("/cursos/no-existe/progreso")).status).toBe(404);
  });

  it("la lección se completa sola al 100 % y suma los puntos de la regla", async () => {
    const parcial = await mvz.post("/cursos/oftalmologia/lecciones/20/avance", { pct: 60 });
    expect(parcial.body).toMatchObject({ completada: false, puntos: 0 });
    const r = await mvz.post("/cursos/oftalmologia/lecciones/20/avance", { pct: 100 });
    expect(r.body).toMatchObject({ completada: true, nueva: true, puntos: 20 });
    expect(r.body.progreso.hechas).toBe(13);
    expect(r.body.progreso.lecciones[20]).toMatchObject({ hecha: true, visto: 100 });
    const otra = await mvz.post("/cursos/oftalmologia/lecciones/20/avance", { pct: 100 });
    expect(otra.body).toMatchObject({ nueva: false, puntos: 0 });
    expect((await mvz.get("/puntos")).body.saldo).toBe(1260);
  });

  it("usa el valor vigente de la regla de puntos", async () => {
    await admin.put("/club/reglas/leccion", { puntos: 35 });
    expect((await mvz.post("/cursos/oftalmologia/lecciones/25/avance", { pct: 100 })).body.puntos).toBe(35);
  });

  it("una lección bloqueada por fecha responde 409", async () => {
    const r = await mvz.post("/cursos/dermatoendocrino/lecciones/6/avance", { pct: 100 });
    expect(r.status).toBe(409);
    expect(r.body.bloqueadaHasta).toBe("2027-01-08");
    const p = await mvz.get("/cursos/dermatoendocrino/progreso");
    expect(p.body.siguiente).toBe(4);
    expect(p.body.examen.estado).toBe("bloqueado");
  });

  it("valida índice y porcentaje", async () => {
    expect((await mvz.post("/cursos/oftalmologia/lecciones/99/avance", { pct: 100 })).status).toBe(404);
    expect((await mvz.post("/cursos/oftalmologia/lecciones/1/avance", { pct: 150 })).status).toBe(400);
    expect((await mvz.post("/cursos/oftalmologia/lecciones/-1/avance", { pct: 50 })).status).toBe(400);
  });
});
