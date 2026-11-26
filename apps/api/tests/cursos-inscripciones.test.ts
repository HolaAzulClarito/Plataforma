import { describe, expect, it } from "vitest";
import { admin, call, get, mvz, useDemo } from "./helpers";

useDemo();

describe("Cursos (público y administración)", () => {
  it("lista los 12 cursos publicados y el detalle con temario y módulos", async () => {
    expect((await get("/api/cursos")).body).toHaveLength(12);
    const d = await get("/api/cursos/oftalmologia");
    expect(d.status).toBe(200);
    expect(d.body.tipo).toBe("Diplomado");
    expect(d.body.modulos).toHaveLength(4);
    expect(d.body.temario).toHaveLength(31);
    expect(d.body.examen).toMatchObject({ aprobatoria: 80, intentos: 2 });
  });

  it("el temario respeta el desbloqueo por fecha (DRIP)", async () => {
    const d = await get("/api/cursos/dermatoendocrino");
    expect(d.body.temario[5].bloqueadaHasta).toBe("");
    expect(d.body.temario[6].bloqueadaHasta).toBe("2027-01-08");
  });

  it("un curso en borrador deja de verse en público pero no para admin", async () => {
    expect((await admin.patch("/cursos/odontologia", { estado: "borrador" })).status).toBe(200);
    expect((await get("/api/cursos")).body).toHaveLength(11);
    expect((await get("/api/cursos/odontologia")).status).toBe(404);
    expect((await get("/api/cursos/odontologia", "admin")).status).toBe(200);
    expect((await get("/api/cursos?todos=1", "admin")).body).toHaveLength(12);
    expect((await get("/api/cursos?todos=1")).body).toHaveLength(11);
  });

  it("programar exige fecha futura", async () => {
    expect((await admin.patch("/cursos/odontologia", { estado: "programado" })).status).toBe(400);
    expect((await admin.patch("/cursos/odontologia", { estado: "programado", fecha: "2026-12-01" })).body.estado).toBe("programado");
  });

  it("lista de administración con conteo por estado y acción en lote", async () => {
    const r = await admin.post("/cursos/lote", { claves: ["s:odontologia", "s:kiroftal-2", "s:no-existe"], estado: "papelera" });
    expect(r.body).toEqual({ actualizados: 2, omitidos: 1 });
    const l = await admin.get("/cursos");
    expect(l.body.conteo.papelera).toBe(2);
    expect(l.body.items).toHaveLength(10);
    expect((await admin.get("/cursos?estado=papelera")).body.items).toHaveLength(2);
  });

  it("vista de administrador sin inscripción respeta el ajuste adminSinInsc", async () => {
    expect((await admin.get("/cursos/inmunologia/vista")).status).toBe(200);
    await admin.patch("/academia/ajustes", { adminSinInsc: false });
    expect((await admin.get("/cursos/inmunologia/vista")).status).toBe(403);
  });

  it("el ajuste resumen oculta el temario antes de inscribirse", async () => {
    await admin.patch("/academia/ajustes", { resumen: false });
    expect((await get("/api/cursos/oftalmologia")).body.temario).toBeNull();
  });
});

describe("Inscripciones", () => {
  it("curso gratuito: la inscripción del médico queda aprobada", async () => {
    const r = await mvz.post("/inscripciones", { curso: "kiroftal-2" });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ s: "kiroftal-2", st: "approved", por: "Inscripción en línea" });
  });

  it("curso con precio: queda pendiente, sin cobro", async () => {
    const r = await mvz.post("/inscripciones", { curso: "diplomado-integral" });
    expect(r.body.st).toBe("pending");
    expect((await mvz.post("/inscripciones", { curso: "diplomado-integral" })).status).toBe(409);
    expect((await mvz.get("/cursos")).body.solicitudes).toHaveLength(1);
  });

  it("no permite inscribirse dos veces ni a cursos inexistentes", async () => {
    expect((await mvz.post("/inscripciones", { curso: "inmunologia" })).status).toBe(409);
    expect((await mvz.post("/inscripciones", { curso: "no-existe" })).status).toBe(404);
    expect((await mvz.post("/inscripciones", { curso: "<script>" })).status).toBe(400);
  });

  it("admin lista, filtra y cuenta por estado", async () => {
    const r = await admin.get("/inscripciones?estado=pending");
    expect(r.body.items).toHaveLength(2);
    expect(r.body.conteo).toEqual({ approved: 12, pending: 2, cancelled: 1 });
    expect((await admin.get("/inscripciones?q=paola")).body.items[0].correo).toBe("paola.ruiz@correo-ejemplo.mx");
  });

  it("admin aprueba una solicitud y en lote", async () => {
    const pend = (await admin.get("/inscripciones?estado=pending")).body.items;
    expect((await admin.patch(`/inscripciones/${pend[0].id}`, { estado: "approved" })).body.st).toBe("approved");
    expect((await admin.post("/inscripciones/lote", { ids: [pend[1].id], estado: "cancelled" })).body).toEqual({ actualizadas: 1 });
    expect((await admin.patch("/inscripciones/9999", { estado: "approved" })).status).toBe(404);
  });

  it("admin inscribe alumnos por correo", async () => {
    const r = await admin.post("/inscripciones", { curso: "odontologia", correos: ["karla.medina@correo-ejemplo.mx"] });
    expect(r.status).toBe(201);
    expect(r.body.inscritas[0]).toMatchObject({ u: "MVZ Karla Medina", st: "approved" });
    expect((await admin.post("/inscripciones", { curso: "odontologia", correos: ["nadie@correo-ejemplo.mx"] })).status).toBe(404);
    expect((await admin.post("/inscripciones", { curso: "odontologia", correos: ["no-es-correo"] })).status).toBe(400);
  });

  it("cancelar quita el acceso pero conserva la constancia", async () => {
    const mine = (await mvz.get("/inscripciones")).body.find((e: { s: string }) => e.s === "inmunologia");
    await admin.patch(`/inscripciones/${mine.id}`, { estado: "cancelled" });
    expect((await mvz.get("/cursos/inmunologia/progreso")).status).toBe(403);
    expect((await mvz.get("/constancias")).body.map((c: { folio: string }) => c.folio)).toContain("KI-2026-001234");
  });

  it("valida el cuerpo", async () => {
    expect((await call("POST", "/api/me/inscripciones", { role: "mvz" })).status).toBe(400);
  });
});

describe("Ajustes de la vista del alumno en CourseDetail (hallazgo 4)", () => {
  it("expone enfoque sin los ajustes sensibles y refleja el cambio del administrador", async () => {
    const a = await get("/api/cursos/oftalmologia");
    expect(a.body.ajustes).toEqual({ enfoque: false });
    await admin.patch("/academia/ajustes", { enfoque: true });
    const b = await get("/api/cursos/oftalmologia");
    expect(b.body.ajustes).toEqual({ enfoque: true });
    expect(b.body.ajustes).not.toHaveProperty("ocultar");
    expect(b.body.ajustes).not.toHaveProperty("adminSinInsc");
  });
});
