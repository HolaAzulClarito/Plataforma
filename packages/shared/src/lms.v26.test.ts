/* Reglas agregadas por el dictamen de QA del 26/11/2026: aprobación por nota final (ADR-006), examen sin preguntas
   calificables, curso de solo examen y CSV seguro. */
import { describe, expect, it } from "vitest";
import { canStillPass, editorIssues, EXAM_DEFAULTS, examPassed, finalGrade, lessonCount, courseModules } from "./lms";
import { csvCell, csvDocument } from "./format";
import type { EditorQuestion, GradeCalc } from "./types";

const q = (over: Partial<EditorQuestion>): EditorQuestion => ({
  tipo: "om",
  texto: "Pregunta",
  puntos: 1,
  requerida: true,
  mezclar: false,
  explicacion: "",
  opciones: ["A", "B"],
  correctas: [0],
  pares: [],
  modelo: "",
  ...over,
});

describe("examPassed: aprobado por nota final según la regla (ADR-006)", () => {
  const AP = 80;
  /* Caso del dictamen: intento 1 = 0.0, intento 2 = 10. */
  const notas = [0, 10];
  const cases: [GradeCalc, number, boolean][] = [
    ["mas_alta", 10, true],
    ["promedio", 5, false],
    ["primer_intento", 0, false],
    ["ultimo_intento", 10, true],
  ];
  it.each(cases)("%s: nota final %d -> aprobado %s", (calc, nota, ok) => {
    expect(finalGrade(notas, calc)).toBe(nota);
    expect(examPassed(notas, calc, AP)).toBe(ok);
  });
  it("sin intentos no hay aprobado", () => {
    for (const [calc] of cases) expect(examPassed([], calc, AP)).toBe(false);
  });
  it("con mas_alta equivale a 'algún intento aprobado'", () => {
    expect(examPassed([5, 8, 6], "mas_alta", AP)).toBe(true);
    expect(examPassed([5, 7.9], "mas_alta", AP)).toBe(false);
  });
  it("ultimo_intento: aprobar y luego reprobar deja el curso no aprobado", () => {
    expect(examPassed([9, 5], "ultimo_intento", AP)).toBe(false);
  });
});

describe("canStillPass: ¿un intento más puede cambiar el resultado?", () => {
  it("sin intentos restantes nunca", () => {
    expect(canStillPass([], "mas_alta", 80, 0)).toBe(false);
  });
  it("sin intentos previos siempre (si la aprobatoria es alcanzable)", () => {
    for (const calc of ["mas_alta", "promedio", "primer_intento", "ultimo_intento"] as GradeCalc[]) expect(canStillPass([], calc, 80, 1)).toBe(true);
  });
  it("mas_alta y ultimo_intento: un 10 siempre puede aprobar", () => {
    expect(canStillPass([0], "mas_alta", 80, 1)).toBe(true);
    expect(canStillPass([0], "ultimo_intento", 80, 1)).toBe(true);
  });
  it("primer_intento reprobado: ningún intento cambia el resultado", () => {
    expect(canStillPass([0], "primer_intento", 80, 1)).toBe(false);
    expect(canStillPass([7.9], "primer_intento", 80, Infinity)).toBe(false);
  });
  it("promedio: depende de cuántos intentos quedan", () => {
    /* [0] + un 10 = 5.0 (no llega a 8); con 4 dieces: 40/5 = 8.0 (sí). */
    expect(canStillPass([0], "promedio", 80, 1)).toBe(false);
    expect(canStillPass([0], "promedio", 80, 4)).toBe(true);
    expect(canStillPass([0], "promedio", 80, Infinity)).toBe(true);
  });
});

describe("editorIssues: examen sin preguntas calificables", () => {
  const lesson = { titulo: "L1", video: { lib: "1", vid: "x" }, dur: "10:00", adjuntos: [], desbloqueo: "" };
  const withQs = (preguntas: EditorQuestion[]) => ({ modulos: [{ nombre: "M1", lecciones: [lesson] }], examen: { ...EXAM_DEFAULTS, titulo: "Examen final", preguntas } });
  it("solo relacionar y abierta: pendiente nuevo, no publicable", () => {
    const p = editorIssues(withQs([q({ tipo: "rel", opciones: [], correctas: [], pares: [["a", "b"]] }), q({ tipo: "ab", opciones: [], correctas: [] })]));
    expect(p).toEqual(["El examen final no tiene preguntas que se califiquen solas"]);
  });
  it("con al menos una calificable no aparece", () => {
    expect(editorIssues(withQs([q({}), q({ tipo: "ab", opciones: [], correctas: [] })]))).toEqual([]);
  });
  it("sin preguntas sigue siendo el pendiente 'sin preguntas' (sin duplicar)", () => {
    expect(editorIssues(withQs([]))).toEqual(["Cierre · Examen final: sin preguntas"]);
  });
});

describe("curso de solo examen final (lessons: 1)", () => {
  it("es válido: 0 lecciones y ningún módulo", () => {
    expect(lessonCount({ lessons: 1 })).toBe(0);
    expect(courseModules({ lessons: 1 })).toEqual([]);
  });
});

describe("csvCell / csvDocument", () => {
  it("neutraliza fórmulas y escapa comillas", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("+52 55")).toBe(`"'+52 55"`);
    expect(csvCell("-1")).toBe(`"'-1"`);
    expect(csvCell("@SUM(A1)")).toBe(`"'@SUM(A1)"`);
    expect(csvCell("Dra. Laura")).toBe(`"Dra. Laura"`);
    expect(csvCell(null)).toBe(`""`);
  });
  it("documento con BOM y salto final", () => {
    expect(csvDocument([["A", 1], ["=B", 2]])).toBe(`\uFEFF"A","1"\n"'=B","2"\n`);
  });
});
