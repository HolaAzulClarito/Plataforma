import { describe, expect, it } from "vitest";
import { admin, get, mvz, useDemo } from "./helpers";

useDemo();

describe("Constancias", () => {
  it("verificación pública de folio con nombre abreviado", async () => {
    const r = await get("/api/constancias/KI-2026-001234");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ folio: "KI-2026-001234", tipo: "diplomado", fecha: "12/09/2026", titular: "L. Méndez" });
    expect(r.text).not.toContain("Laura");
  });

  it("acepta minúsculas y espacios; folio inexistente 404; formato inválido 400", async () => {
    expect((await get("/api/constancias/ki-2026-001290")).status).toBe(200);
    expect((await get("/api/constancias/KI-2026-999999")).status).toBe(404);
    expect((await get("/api/constancias/KI-26-1")).status).toBe(400);
  });

  it("el médico ve sus constancias y el documento para imprimir", async () => {
    const l = await mvz.get("/constancias");
    expect(l.body.map((c: { folio: string }) => c.folio).sort()).toEqual(["KI-2026-001234", "KI-2026-001388"]);
    const d = await mvz.get("/constancias/KI-2026-001234");
    expect(d.body.datos).toMatchObject({ nombre: "Laura Méndez", folio: "KI-2026-001234" });
    expect(d.body.plantilla.id).toBe("c1");
  });

  it("no puede ver el documento de la constancia de otra persona", async () => {
    expect((await mvz.get("/constancias/KI-2026-001290")).status).toBe(404);
  });
});

describe("Webinars", () => {
  it("lista pública con el próximo webinar y detalle", async () => {
    const l = await get("/api/webinars");
    expect(l.body[0]).toMatchObject({ slug: "proximo", inicio: "2026-12-15T20:00:00-06:00", fecha: "15/12/2026", hora: "20:00" });
    expect((await get("/api/webinars/proximo")).body.startsAt).toBeTruthy();
    expect((await get("/api/webinars/no-existe")).status).toBe(404);
  });

  it("registro idempotente y asistencia con +50 puntos y constancia una sola vez", async () => {
    expect((await mvz.post("/webinars/proximo/registro")).body).toMatchObject({ registrado: true, asistio: false });
    expect((await mvz.post("/webinars/proximo/registro")).status).toBe(200);
    const a = await mvz.post("/webinars/proximo/asistencia");
    expect(a.body).toMatchObject({ asistio: true, puntos: 50 });
    expect(a.body.constancia.tipo).toBe("webinar");
    const b = await mvz.post("/webinars/proximo/asistencia");
    expect(b.body.puntos).toBe(0);
    expect((await mvz.get("/puntos")).body.saldo).toBe(1290);
    const h = (await admin.get("/webinars")).body.historial[0];
    expect(h.asistentes).toBe(1);
    expect((await admin.get("/webinars/proximo/asistentes")).body).toEqual(["Dra. Laura Méndez"]);
  });

  const nuevo = {
    titulo: "Dermatitis atópica canina",
    tituloEn: "Canine atopic dermatitis",
    grado: "MVZ",
    ponente: "Ponente de ejemplo",
    fecha: "2027-01-20",
    hora: "20:00",
    duracion: 90,
    umbral: 45,
    slug: "dermatitis-atopica",
    modo: "cloudflare",
    publicado: true,
  };

  it("admin crea un webinar con datos para el ponente", async () => {
    const r = await admin.post("/webinars", nuevo);
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ slug: "dermatitis-atopica", inicio: "2027-01-20T20:00:00-06:00", servidor: expect.stringContaining("rtmps://") });
    expect(r.body.clave).toMatch(/^demo-/);
    const pub = await get("/api/webinars/dermatitis-atopica");
    expect(pub.status).toBe(200);
    expect(pub.text).not.toContain(r.body.clave);
    expect((await mvz.post("/webinars/dermatitis-atopica/registro")).body.registrado).toBe(true);
  });

  it("valida fecha futura, umbral, dirección repetida y enlace de YouTube", async () => {
    expect((await admin.post("/webinars", { ...nuevo, fecha: "2026-01-01" })).status).toBe(400);
    expect((await admin.post("/webinars", { ...nuevo, umbral: 100 })).status).toBe(400);
    expect((await admin.post("/webinars", { ...nuevo, slug: "proximo" })).status).toBe(409);
    expect((await admin.post("/webinars", { ...nuevo, modo: "youtube", youtube: "https://example.com" })).status).toBe(400);
    expect((await admin.post("/webinars", { ...nuevo, flyer: "data:image/gif;base64,R0lGOD" })).status).toBe(400);
    const yt = await admin.post("/webinars", { ...nuevo, slug: "con-youtube", modo: "youtube", youtube: "https://youtu.be/7cYE999nfe8" });
    expect(yt.status).toBe(201);
    expect((await mvz.get("/webinars/con-youtube")).body.youtube).toBe("https://youtu.be/7cYE999nfe8");
  });

  it("un webinar en borrador no es público", async () => {
    await admin.post("/webinars", { ...nuevo, slug: "borrador", publicado: false });
    expect((await get("/api/webinars/borrador")).status).toBe(404);
    expect((await admin.get("/webinars")).body.nuevos).toHaveLength(1);
  });
});
