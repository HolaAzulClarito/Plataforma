import { describe, expect, it } from "vitest";
import {
  courseIsPublic,
  courseModules,
  dripDate,
  examConfig,
  finalGrade,
  gradeAnswers,
  isPassing,
  lessonsDone,
  maxAttempts,
  nextLesson,
  progressPct,
} from "./lms";
import type { Question } from "./types";

describe("courseModules", () => {
  it("divide 31 lecciones en 4 módulos sin huecos ni traslapes", () => {
    const m = courseModules({ lessons: 32 });
    expect(m).toHaveLength(4);
    expect(m[0]!.from).toBe(0);
    expect(m[m.length - 1]!.to).toBe(30);
    for (let i = 1; i < m.length; i++) expect(m[i]!.from).toBe(m[i - 1]!.to + 1);
  });
  it("usa 2 módulos entre 4 y 11 lecciones y 1 debajo de 4", () => {
    expect(courseModules({ lessons: 10 })).toHaveLength(2);
    expect(courseModules({ lessons: 3 })).toHaveLength(1);
  });
  it("un curso de solo examen final no tiene módulos de lecciones", () => {
    expect(courseModules({ lessons: 1 })).toHaveLength(0);
  });
});

describe("avance", () => {
  const c = { lessons: 5 }; // 4 lecciones + examen
  it("lessonsDone exige todas las lecciones", () => {
    expect(lessonsDone([0, 1, 2], c)).toBe(false);
    expect(lessonsDone([0, 1, 2, 3], c)).toBe(true);
  });
  it("nextLesson salta las completadas y las bloqueadas por fecha", () => {
    expect(nextLesson(c, [0])).toBe(1);
    expect(nextLesson(c, [0], (i) => i === 1)).toBe(2);
    expect(nextLesson(c, [0, 1, 2, 3])).toBe(-1);
  });
  it("nextLesson devuelve una bloqueada si es la única pendiente", () => {
    expect(nextLesson(c, [0, 1, 2], (i) => i === 3)).toBe(3);
  });
  it("progressPct nunca pasa de 100", () => {
    expect(progressPct(12, { lessons: 32 })).toBe(38);
    expect(progressPct(40, { lessons: 32 })).toBe(100);
  });
  it("dripDate bloquea solo desde la lección indicada y antes de la fecha", () => {
    const rule = { from: 6, fecha: "2027-01-08" };
    expect(dripDate(rule, { lessons: 10 }, 5, "2026-11-26")).toBe("");
    expect(dripDate(rule, { lessons: 10 }, 6, "2026-11-26")).toBe("2027-01-08");
    expect(dripDate(rule, { lessons: 10 }, 6, "2027-01-08")).toBe("");
  });
});

describe("examen final", () => {
  it("maxAttempts: 0 es sin límite y suma los adicionales autorizados", () => {
    expect(maxAttempts(0)).toBe(Infinity);
    expect(maxAttempts(2, 1)).toBe(3);
  });
  it("isPassing compara contra el porcentaje mínimo", () => {
    expect(isPassing(8, 80)).toBe(true);
    expect(isPassing(7.9, 80)).toBe(false);
  });
  it("finalGrade aplica cada regla de cálculo", () => {
    const n = [6, 9, 7.5];
    expect(finalGrade(n, "mas_alta")).toBe(9);
    expect(finalGrade(n, "promedio")).toBe(7.5);
    expect(finalGrade(n, "primer_intento")).toBe(6);
    expect(finalGrade(n, "ultimo_intento")).toBe(7.5);
    expect(finalGrade([], "mas_alta")).toBeUndefined();
  });
  it("gradeAnswers exige todas las correctas en respuesta múltiple", () => {
    const qs: Question[] = [
      { t: "vf", q: "a", o: ["V", "F"], c: [0] },
      { t: "rm", q: "b", o: ["x", "y", "z"], c: [0, 1] },
    ];
    expect(gradeAnswers(qs, [{ i: 0, v: [0] }, { i: 1, v: [0] }]).nota).toBe(5);
    expect(gradeAnswers(qs, [{ i: 0, v: [0] }, { i: 1, v: [1, 0] }]).nota).toBe(10);
    expect(gradeAnswers(qs, []).nota).toBe(0);
  });
  it("examConfig mezcla con los valores por defecto", () => {
    expect(examConfig({ intentos: 2 })).toMatchObject({ intentos: 2, aprobatoria: 80, calculo: "mas_alta" });
  });
});

describe("visibilidad del curso", () => {
  it("programado solo es público cuando llega la fecha", () => {
    expect(courseIsPublic("programado", "2026-12-01", "2026-11-26")).toBe(false);
    expect(courseIsPublic("programado", "2026-12-01", "2026-12-01")).toBe(true);
    expect(courseIsPublic("borrador", undefined, "2026-11-26")).toBe(false);
    expect(courseIsPublic(undefined, undefined, "2026-11-26")).toBe(true);
  });
});
