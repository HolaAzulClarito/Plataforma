/* ADR-006: el curso se aprueba por nota final según la regla de cálculo, y un examen sin preguntas calificables nunca
   está "disponible". Hallazgos 1 y 2 del dictamen de QA del 26/11/2026. */
import { describe, expect, it } from "vitest";
import type { GradeCalc } from "@kiron/shared";
import { admin, mvz, useDemo } from "./helpers";
import { db, type AttemptRecord } from "../src/store";

useDemo();

/* Curso gratuito de solo examen final (lessons: 1): el examen se abre al inscribirse. */
const S = "simposio-parasitologia-cardiologia";
const base = `/cursos/${S}/examen`;
const U = "Dra. Laura Méndez";

const setExam = async (over: Record<string, unknown>) => {
  const cfg = (await admin.get(`/cursos/${S}/examen`)).body;
  expect((await admin.put(`/cursos/${S}/examen`, { ...cfg, ...over })).status).toBe(200);
};

const answers = (ids: { i: number }[], correct: boolean) =>
  ids.map(({ i }) => {
    const q = db().examenEjemplo[i]!;
    return { i, v: correct ? q.c : [q.o.length - 1 === q.c[0] ? 0 : q.o.length - 1] };
  });

const attempt = async (correct: boolean) => {
  const ses = (await mvz.post(`${base}/iniciar`)).body;
  return mvz.post(`${base}/intentos`, { sesion: ses.id, respuestas: answers(ses.preguntas, correct) });
};

/* Intentos cerrados sembrados directamente (nota 0.0 y luego 10), el caso exacto del dictamen. */
const seed = (notas: number[]) =>
  notas.forEach((nota, k) =>
    db().intentos.push({
      id: 900 + k,
      u: U,
      s: S,
      n: k + 1,
      f: "25/11/2026",
      nota,
      ok: nota * 10 >= 80,
      t: 600,
      estado: "calificado",
      ans: null,
      preguntas: [],
      sesion: null,
      iniciadaEn: null,
      venceEn: null,
    } satisfies AttemptRecord),
  );

describe("ADR-006: aprobado por nota final (intento 1 = 0.0, intento 2 = 10)", () => {
  const cases: [GradeCalc, number, boolean][] = [
    ["mas_alta", 10, true],
    ["promedio", 5, false],
    ["primer_intento", 0, false],
    ["ultimo_intento", 10, true],
  ];
  it.each(cases)("%s: notaFinal %d, aprobado %s; libro de calificaciones coherente", async (calculo, nota, ok) => {
    await setExam({ intentos: 2, calculo });
    await mvz.post("/inscripciones", { curso: S });
    seed([0, 10]);
    const st = (await mvz.get(base)).body;
    expect(st).toMatchObject({ notaFinal: nota, aprobado: ok, estado: ok ? "aprobado" : "sin_intentos" });
    const row = (await admin.get(`/academia/calificaciones?curso=${S}`)).body.find((r: { u: string }) => r.u === U);
    expect(row.estado).toBe(ok ? "Aprobado" : "Sin intentos");
    expect(row.nota).toBe(ok ? nota : null);
  });
});

describe("ADR-006: flujo real por regla", () => {
  it("primer_intento: reprobar el primero deja 'sin_intentos' aunque queden intentos, sin constancia ni solicitud", async () => {
    await setExam({ intentos: 3, calculo: "primer_intento" });
    await mvz.post("/inscripciones", { curso: S });
    const r = await attempt(false);
    expect(r.body.constancia).toBeNull();
    expect(r.body.notaFinal).toBe(0);
    const st = (await mvz.get(base)).body;
    expect(st).toMatchObject({ estado: "sin_intentos", aprobado: false, intentosRestantes: 2, puedeSolicitar: false });
    expect(st.motivo).toMatch(/Primer intento/);
    expect((await mvz.post(`${base}/iniciar`)).status).toBe(409);
    expect((await mvz.post(`${base}/solicitudes`)).status).toBe(409);
    const row = (await admin.get(`/academia/calificaciones?curso=${S}`)).body.find((x: { u: string }) => x.u === U);
    expect(row.estado).toBe("Sin intentos");
  });

  it("mas_alta: reprobar y luego aprobar emite la constancia (comportamiento anterior)", async () => {
    await setExam({ intentos: 2, calculo: "mas_alta" });
    await mvz.post("/inscripciones", { curso: S });
    expect((await attempt(false)).body.constancia).toBeNull();
    const r = await attempt(true);
    expect(r.body).toMatchObject({ notaFinal: 10, intento: { ok: true } });
    expect(r.body.constancia.folio).toMatch(/^KI-2026-\d{6}$/);
  });

  it("ultimo_intento: con intentos restantes sigue disponible tras reprobar y aprueba con el último", async () => {
    await setExam({ intentos: 3, calculo: "ultimo_intento" });
    await mvz.post("/inscripciones", { curso: S });
    await attempt(false);
    expect((await mvz.get(base)).body.estado).toBe("disponible");
    const r = await attempt(true);
    expect(r.body.constancia).not.toBeNull();
    expect((await mvz.get(base)).body).toMatchObject({ estado: "aprobado", notaFinal: 10 });
  });

  it("promedio: si los intentos restantes no alcanzan, queda 'sin_intentos'; con intento adicional autorizado vuelve a estar disponible", async () => {
    /* aprobatoria 60: [0] + un 10 = 5.0 (no alcanza); [0] + dos 10 = 6.7 (sí). */
    await setExam({ intentos: 2, calculo: "promedio", aprobatoria: 60 });
    await mvz.post("/inscripciones", { curso: S });
    await attempt(false);
    const st = (await mvz.get(base)).body;
    expect(st).toMatchObject({ estado: "sin_intentos", intentosRestantes: 1, puedeSolicitar: true });
    const req = await mvz.post(`${base}/solicitudes`);
    expect(req.status).toBe(201);
    await admin.post(`/academia/solicitudes/${req.body.id}`, { accion: "autorizar" });
    expect((await mvz.get(base)).body).toMatchObject({ estado: "disponible", intentosRestantes: 2 });
    await attempt(true);
    const r = await attempt(true);
    expect(r.body.notaFinal).toBe(6.7);
    expect(r.body.constancia).not.toBeNull();
  });
});

describe("Examen sin preguntas calificables", () => {
  it("nunca está 'disponible' y no se puede iniciar", async () => {
    db().examenEjemplo = [];
    await mvz.post("/inscripciones", { curso: S });
    const st = (await mvz.get(base)).body;
    expect(st.estado).toBe("bloqueado");
    expect(st.motivo).toBe("El examen final todavía no tiene preguntas");
    expect((await mvz.post(`${base}/iniciar`)).status).toBe(409);
  });

  it("el editor no publica un curso cuyo examen solo tiene relacionar o abierta", async () => {
    const c = (
      await admin.post("/editor/cursos", {
        titulo: "Curso con examen abierto",
        tituloEn: "Open exam course",
        tipo: "Curso",
        categoria: "Curso independiente",
        instructor: "Ponente",
        nivel: "Intermedio",
        precioRegular: 0,
        precio: 0,
        modulos: [{ nombre: "M1", lecciones: 1 }],
      })
    ).body.curso;
    await admin.patch(`/editor/cursos/${c.id}/modulos/0/lecciones/0`, { video: "12345/0f8fad5b-d9cb-469f-a165-70867728950e", dur: "10:00" });
    await admin.post(`/editor/cursos/${c.id}/examen/preguntas`, { tipo: "ab" });
    await admin.put(`/editor/cursos/${c.id}/examen/preguntas/0`, { tipo: "ab", texto: "Describe el caso", modelo: "Respuesta modelo" });
    const p = await admin.post(`/editor/cursos/${c.id}/publicar`);
    expect(p.status).toBe(409);
    expect(p.body.pendientes).toEqual(["El examen final no tiene preguntas que se califiquen solas"]);
    expect((await admin.patch(`/cursos/${c.slug}`, { estado: "publicado" })).status).toBe(400);
  });
});
