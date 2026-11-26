import { describe, expect, it } from "vitest";
import { admin, useDemo } from "./helpers";
import { app } from "../src/app";

useDemo();

describe("Academia (administración)", () => {
  it("ajustes globales: lectura y cambio parcial", async () => {
    expect((await admin.get("/academia/ajustes")).body).toMatchObject({ ocultar: true, resumen: true, adminSinInsc: true });
    expect((await admin.patch("/academia/ajustes", { ocultar: false })).body.ocultar).toBe(false);
    expect((await admin.patch("/academia/ajustes", { pct: 0 })).status).toBe(400);
  });

  it("activar ocultar desactiva revelar respuestas en todos los exámenes", async () => {
    await admin.patch("/academia/ajustes", { ocultar: false });
    const cfg = (await admin.get("/cursos/kiroftal-2/examen")).body;
    await admin.put("/cursos/kiroftal-2/examen", { ...cfg, retro: "revelar" });
    await admin.patch("/academia/ajustes", { ocultar: true });
    expect((await admin.get("/cursos/kiroftal-2/examen")).body.retro).toBe("defecto");
  });

  it("configuración de examen por curso", async () => {
    const rows = (await admin.get("/academia/examenes")).body;
    expect(rows.find((r: { slug: string }) => r.slug === "inmunologia").config.intentos).toBe(2);
    expect((await admin.get("/cursos/no-existe/examen")).status).toBe(404);
  });

  it("libro de calificaciones con estados", async () => {
    const r = (await admin.get("/academia/calificaciones")).body;
    const by = (u: string, s: string) => r.find((x: { u: string; s: string }) => x.u === u && x.s === s);
    expect(by("MVZ Paola Ruiz", "oftalmologia")).toMatchObject({ estado: "Aprobado", nota: 9.5, avance: 100 });
    expect(by("Dr. Andrés Salinas", "dermatoendocrino")).toMatchObject({ estado: "Sin intentos", intentosUsados: 1, intentosMax: 1 });
    expect(by("MVZ Sofía Cárdenas", "diplomado-inmunologia").estado).toBe("Inactivo");
    expect(by("MVZ Diego Herrera", "inmunologia")).toMatchObject({ nota: 8.7, intentosUsados: 2 });
    expect((await admin.get("/academia/calificaciones?curso=oftalmologia")).body.every((x: { s: string }) => x.s === "oftalmologia")).toBe(true);
  });

  it("historial de un alumno", async () => {
    const h = await admin.get("/academia/calificaciones/historial?alumno=MVZ%20Diego%20Herrera&curso=inmunologia");
    expect(h.body.map((e: { texto: string }) => e.texto).join(" | ")).toMatch(/intento 2 · 8.7 · aprobado/);
    expect((await admin.get("/academia/calificaciones/historial?alumno=Nadie&curso=inmunologia")).status).toBe(404);
  });

  it("alumnos: filtros, orden e importación sin repetidos", async () => {
    const all = (await admin.get("/academia/alumnos")).body;
    expect(all).toHaveLength(13);
    expect(all[0].registro).toBe("21/11/2026");
    expect((await admin.get("/academia/alumnos?orden=nombre")).body[0].nombre).toBe("MVZ Ana Lucía Torres");
    expect((await admin.get("/academia/alumnos?curso=oftalmologia")).body).toHaveLength(4);
    const imp = await admin.post("/academia/alumnos/importar", {
      grupo: 3,
      alumnos: [
        { nombre: "MVZ Alumno Nuevo", correo: "alumno.nuevo@correo-ejemplo.mx" },
        { nombre: "MVZ Paola Ruiz", correo: "PAOLA.RUIZ@correo-ejemplo.mx" },
      ],
    });
    expect(imp.body).toEqual({ agregados: 1, repetidos: 1 });
    expect((await admin.get("/academia/grupos/3")).body.total).toBe(10);
    expect((await admin.post("/academia/alumnos/importar", { alumnos: [{ nombre: "X", correo: "mal" }] })).status).toBe(400);
  });

  it("grupos: crear, asignar curso con fecha límite y ver detalle", async () => {
    const g = await admin.post("/academia/grupos", { nombre: "Clínica de ejemplo" });
    expect(g.status).toBe(201);
    const a = await admin.patch(`/academia/grupos/${g.body.id}`, { curso: "kiroftal-2", vence: "2027-01-31" });
    expect(a.body).toMatchObject({ curso: "kiroftal-2", vence: "31/01/2027" });
    expect((await admin.patch(`/academia/grupos/${g.body.id}`, { curso: "kiroftal-2", vence: "2027-02-31" })).status).toBe(400);
    const d = await admin.get("/academia/grupos/3");
    expect(d.body.alumnos.map((x: { u: string }) => x.u)).toContain("MVZ Paola Ruiz");
    expect((await admin.get("/academia/grupos/99")).status).toBe(404);
  });

  it("banco de preguntas y automatizaciones", async () => {
    const q = await admin.post("/academia/banco", { texto: "¿Pregunta de ejemplo?", tipo: "om", tema: "Cardiología" });
    expect(q.status).toBe(201);
    expect((await admin.get("/academia/banco")).body[0].usos).toBe(0);
    expect((await admin.post("/academia/banco", { texto: "x", tipo: "zz", tema: "x" })).status).toBe(400);
    const a = await admin.patch("/academia/automatizaciones/5", { panel: true });
    expect(a.body).toMatchObject({ id: 5, panel: true, activa: true });
    expect((await admin.patch("/academia/automatizaciones/99", { panel: true })).status).toBe(404);
  });

  it("reportes: KPIs y descarga CSV con BOM", async () => {
    const r = await admin.get("/academia/reportes");
    expect(r.body.kpis.constancias).toBe(5);
    expect(r.body.porCurso.find((x: { slug: string }) => x.slug === "oftalmologia")).toMatchObject({ inscritas: 4, terminaron: 1 });
    const csv = await admin.get("/academia/reportes/alumno");
    expect(csv.headers.get("content-type")).toContain("text/csv");
    const raw = new Uint8Array(await (await app.request("/api/admin/academia/reportes/alumno", { headers: { "X-Demo-Role": "admin" } })).arrayBuffer());
    expect([...raw.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(csv.text).toContain("paola.ruiz@correo-ejemplo.mx");
    expect((await admin.get("/academia/reportes/inactividad")).text).toContain("Sofía");
    expect((await admin.get("/academia/reportes/otro")).status).toBe(400);
  });

  it("tablero con cifras de ejemplo y CSV", async () => {
    const t = await admin.get("/tablero");
    expect(t.body).toMatchObject({ ejemplo: true, cedulasPendientes: 3, inscripcionesPendientes: 2 });
    expect(t.body.kpis).toHaveLength(4);
    expect((await admin.get("/tablero?formato=csv")).text).toContain("Indicador,Valor");
  });
});
