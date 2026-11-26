import { describe, expect, it } from "vitest";
import { EXAM_GRACE_SECONDS } from "@kiron/shared";
import { admin, advance, mvz, useDemo } from "./helpers";
import { db } from "../src/store";

useDemo();

/* Curso gratuito de solo examen final: el examen se abre al inscribirse. */
const S = "simposio-parasitologia-cardiologia";
const base = `/cursos/${S}/examen`;

/* Respuestas correctas del examen de ejemplo (lado servidor), para armar envíos en los tests. */
const answers = (ids: { i: number }[], correct: boolean) =>
  ids.map(({ i }) => {
    const q = db().examenEjemplo[i]!;
    return { i, v: correct ? q.c : [q.o.length - 1 === q.c[0] ? 0 : q.o.length - 1] };
  });

const enrollAndStart = async () => {
  await mvz.post("/inscripciones", { curso: S });
  return (await mvz.post(`${base}/iniciar`)).body;
};

describe("Examen final", () => {
  it("bloqueado mientras faltan lecciones", async () => {
    const st = await mvz.get("/cursos/oftalmologia/examen");
    expect(st.body.estado).toBe("bloqueado");
    expect((await mvz.post("/cursos/oftalmologia/examen/iniciar")).status).toBe(409);
  });

  it("sin inscripción aprobada no se puede presentar", async () => {
    expect((await mvz.get(base)).status).toBe(403);
    expect((await mvz.post(`${base}/iniciar`)).status).toBe(403);
  });

  it("ni el estado ni la sesión exponen las respuestas correctas", async () => {
    const ses = await enrollAndStart();
    expect(ses.preguntas).toHaveLength(5);
    expect(JSON.stringify(ses)).not.toMatch(/"c":/);
    const st = await mvz.get(base);
    expect(st.body.estado).toBe("en_curso");
    expect(st.text).not.toMatch(/"c":/);
  });

  it("el texto de ejemplo habla de un solo examen final", async () => {
    const ses = await enrollAndStart();
    const all = JSON.stringify(ses.preguntas);
    expect(all).toContain("aprobar el examen final");
    expect(all).toContain("Aprobar el examen final");
    expect(all).not.toMatch(/los exámenes/i);
  });

  it("reiniciar con una sesión abierta devuelve la misma", async () => {
    const a = await enrollAndStart();
    const b = (await mvz.post(`${base}/iniciar`)).body;
    expect(b.id).toBe(a.id);
    expect(b.venceEn).toBe(a.venceEn);
  });

  it("el servidor califica: aprobado emite constancia y suma 300 puntos", async () => {
    const ses = await enrollAndStart();
    const r = await mvz.post(`${base}/intentos`, { sesion: ses.id, respuestas: answers(ses.preguntas, true) });
    expect(r.status).toBe(200);
    expect(r.body.intento).toMatchObject({ n: 1, nota: 10, ok: true });
    expect(r.body.constancia.folio).toMatch(/^KI-2026-\d{6}$/);
    expect(r.body.puntos).toBe(300);
    expect(r.body.detalle).toBeNull();
    expect((await mvz.get("/puntos")).body.saldo).toBe(1540);
    expect((await mvz.get(base)).body.estado).toBe("aprobado");
    expect((await mvz.post(`${base}/iniciar`)).status).toBe(409);
    const v = await mvz.get(`/constancias`);
    expect(v.body.some((c: { ref: string }) => c.ref === S)).toBe(true);
  });

  it("con el ajuste ocultar apagado devuelve el detalle de respuestas", async () => {
    await admin.patch("/academia/ajustes", { ocultar: false });
    const ses = await enrollAndStart();
    const r = await mvz.post(`${base}/intentos`, { sesion: ses.id, respuestas: answers(ses.preguntas, false) });
    expect(r.body.detalle).toHaveLength(5);
    expect(r.body.detalle[0].correctas.length).toBeGreaterThan(0);
  });

  it("reprobado no emite constancia; intentos agotados y solicitud de intento adicional", async () => {
    const ses = await enrollAndStart();
    const r = await mvz.post(`${base}/intentos`, { sesion: ses.id, respuestas: answers(ses.preguntas, false) });
    expect(r.body.intento.ok).toBe(false);
    expect(r.body.constancia).toBeNull();
    expect(r.body.intentosRestantes).toBe(0);
    expect((await mvz.post(`${base}/iniciar`)).status).toBe(409);
    const st = await mvz.get(base);
    expect(st.body).toMatchObject({ estado: "sin_intentos", intentosUsados: 1, intentosMax: 1 });

    const req = await mvz.post(`${base}/solicitudes`);
    expect(req.status).toBe(201);
    expect((await mvz.post(`${base}/solicitudes`)).status).toBe(409);
    const ok = await admin.post(`/academia/solicitudes/${req.body.id}`, { accion: "autorizar" });
    expect(ok.body.estado).toBe("autorizado");
    expect((await admin.post(`/academia/solicitudes/${req.body.id}`, { accion: "rechazar" })).status).toBe(409);
    const st2 = await mvz.get(base);
    expect(st2.body).toMatchObject({ estado: "disponible", intentosMax: 2, intentosRestantes: 1 });
  });

  it("solo se pide intento adicional con intentos agotados", async () => {
    await mvz.post("/inscripciones", { curso: S });
    expect((await mvz.post(`${base}/solicitudes`)).status).toBe(409);
  });

  it("intentos sin límite cuando el examen tiene 0", async () => {
    const cfg = (await admin.get(`/cursos/${S}/examen`)).body;
    await admin.put(`/cursos/${S}/examen`, { ...cfg, intentos: 0 });
    const ses = await enrollAndStart();
    expect(ses.intentosMax).toBeNull();
    const r = await mvz.post(`${base}/intentos`, { sesion: ses.id, respuestas: answers(ses.preguntas, false) });
    expect(r.body.intentosRestantes).toBeNull();
    expect((await mvz.post(`${base}/iniciar`)).status).toBe(200);
  });

  it("fuera de tiempo (más la tolerancia) se rechaza y el intento queda en 0.0", async () => {
    const ses = await enrollAndStart();
    expect(ses.venceEn).not.toBeNull();
    advance(30 * 60_000 + (EXAM_GRACE_SECONDS + 1) * 1000);
    const r = await mvz.post(`${base}/intentos`, { sesion: ses.id, respuestas: answers(ses.preguntas, true) });
    expect(r.status).toBe(409);
    const st = await mvz.get(base);
    expect(st.body).toMatchObject({ estado: "sin_intentos", notaFinal: 0 });
  });

  it("dentro de la tolerancia todavía se califica y el tiempo usado se recorta al límite", async () => {
    const ses = await enrollAndStart();
    advance(30 * 60_000 + 5_000);
    const r = await mvz.post(`${base}/intentos`, { sesion: ses.id, respuestas: answers(ses.preguntas, true) });
    expect(r.status).toBe(200);
    expect(r.body.intento.t).toBe(1800);
  });

  it("el examen programado no se abre antes de su fecha", async () => {
    const cfg = (await admin.get(`/cursos/${S}/examen`)).body;
    await admin.put(`/cursos/${S}/examen`, { ...cfg, desbloqueo: "2026-12-20" });
    await mvz.post("/inscripciones", { curso: S });
    const st = await mvz.get(base);
    expect(st.body).toMatchObject({ estado: "programado", abreEl: "2026-12-20" });
    expect((await mvz.post(`${base}/iniciar`)).status).toBe(409);
  });

  it("maxPreg limita las preguntas por intento", async () => {
    const cfg = (await admin.get(`/cursos/${S}/examen`)).body;
    await admin.put(`/cursos/${S}/examen`, { ...cfg, maxPreg: 3 });
    expect((await enrollAndStart()).preguntas).toHaveLength(3);
  });

  it("rechaza respuestas de preguntas ajenas, opciones inexistentes y sesiones desconocidas", async () => {
    const ses = await enrollAndStart();
    const unasked = [0, 1, 2, 3, 4].find((i) => !ses.preguntas.some((p: { i: number }) => p.i === i));
    const first = ses.preguntas[0];
    expect((await mvz.post(`${base}/intentos`, { sesion: ses.id, respuestas: [{ i: first.i, v: [7] }] })).status).toBe(400);
    expect((await mvz.post(`${base}/intentos`, { sesion: ses.id, respuestas: [{ i: 150, v: [0] }] })).status).toBe(400);
    if (unasked !== undefined) expect((await mvz.post(`${base}/intentos`, { sesion: ses.id, respuestas: [{ i: unasked, v: [0] }] })).status).toBe(400);
    expect((await mvz.post(`${base}/intentos`, { sesion: "00000000-0000-4000-8000-000000000000", respuestas: [] })).status).toBe(409);
    expect((await mvz.post(`${base}/intentos`, { sesion: "no-uuid", respuestas: [] })).status).toBe(400);
  });

  it("no permite revelar respuestas si el ajuste ocultar está activo", async () => {
    const cfg = (await admin.get(`/cursos/${S}/examen`)).body;
    expect((await admin.put(`/cursos/${S}/examen`, { ...cfg, retro: "revelar" })).status).toBe(400);
    expect((await admin.put(`/cursos/${S}/examen`, { ...cfg, aprobatoria: 0 })).status).toBe(400);
  });
});

describe("Intentos y solicitudes (administración)", () => {
  it("lista intentos sin exponerlos al médico y muestra el detalle solo a admin", async () => {
    const ses = await enrollAndStart();
    await mvz.post(`${base}/intentos`, { sesion: ses.id, respuestas: answers(ses.preguntas, true) });
    const l = await admin.get(`/academia/intentos?curso=${S}`);
    expect(l.body).toHaveLength(1);
    expect(l.body[0]).toMatchObject({ u: "Dra. Laura Méndez", ok: true, conDetalle: true });
    const d = await admin.get(`/academia/intentos/${l.body[0].id}`);
    expect(d.body.respuestas[0].correctas.length).toBeGreaterThan(0);
    expect((await admin.get("/academia/intentos?q=diego")).body).toHaveLength(2);
    expect((await admin.get("/academia/intentos/9999")).status).toBe(404);
  });

  it("la solicitud de ejemplo de Andrés Salinas se puede rechazar", async () => {
    const l = await admin.get("/academia/solicitudes");
    expect(l.body[0]).toMatchObject({ u: "Dr. Andrés Salinas", estado: "pendiente" });
    expect((await admin.post(`/academia/solicitudes/${l.body[0].id}`, { accion: "rechazar" })).body.estado).toBe("rechazado");
    expect((await admin.post(`/academia/solicitudes/${l.body[0].id}`, { accion: "otra" })).status).toBe(400);
  });
});
