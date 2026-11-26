import { describe, expect, it } from "vitest";
import { attemptsLeft, bunnyIds, canIssueCertificate, editorIssues, EXAM_DEFAULTS, gradableQuestions, maxAttempts } from "./lms";
import type { EditorCourse, EditorQuestion } from "./types";

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

const course = (over: Partial<Pick<EditorCourse, "modulos" | "examen">> = {}): Pick<EditorCourse, "modulos" | "examen"> => ({
  modulos: [{ nombre: "M1", lecciones: [{ titulo: "Lección 1", video: { lib: "123", vid: "abc" }, dur: "12:40", adjuntos: [], desbloqueo: "" }] }],
  examen: { ...EXAM_DEFAULTS, titulo: "Examen final", preguntas: [q({})] },
  ...over,
});

describe("attemptsLeft", () => {
  it("resta los usados sin bajar de cero", () => {
    expect(attemptsLeft(maxAttempts(2, 1), 1)).toBe(2);
    expect(attemptsLeft(2, 5)).toBe(0);
  });
  it("sin límite devuelve Infinity", () => {
    expect(attemptsLeft(maxAttempts(0, 3), 10)).toBe(Infinity);
  });
});

describe("canIssueCertificate", () => {
  it("exige lecciones completas y examen aprobado", () => {
    expect(canIssueCertificate(true, true)).toBe(true);
    expect(canIssueCertificate(true, false)).toBe(false);
    expect(canIssueCertificate(false, true)).toBe(false);
  });
});

describe("bunnyIds", () => {
  const vid = "0f8fad5b-d9cb-469f-a165-70867728950e";
  it("lee la URL de embed", () => {
    expect(bunnyIds(`https://iframe.mediadelivery.net/embed/12345/${vid}?autoplay=false`)).toEqual({ lib: "12345", vid });
  });
  it("lee el formato librería/ID y normaliza a minúsculas", () => {
    expect(bunnyIds(`12345/${vid.toUpperCase()}`)).toEqual({ lib: "12345", vid });
  });
  it("devuelve null si no hay datos válidos", () => {
    expect(bunnyIds("https://youtube.com/watch?v=x")).toBeNull();
  });
});

describe("editorIssues", () => {
  it("un curso completo no tiene pendientes", () => {
    expect(editorIssues(course())).toEqual([]);
  });
  it("detecta video, duración y examen sin preguntas", () => {
    const p = editorIssues(
      course({
        modulos: [{ nombre: "M1", lecciones: [{ titulo: "L1", video: { lib: "", vid: "" }, dur: "", adjuntos: [], desbloqueo: "" }] }],
        examen: { ...EXAM_DEFAULTS, titulo: "Examen final", preguntas: [] },
      }),
    );
    expect(p).toHaveLength(3);
    expect(p.join(" ")).toMatch(/video de Bunny/);
    expect(p.join(" ")).toMatch(/sin preguntas/);
  });
  it("pide dos opciones y una correcta en opción múltiple", () => {
    const p = editorIssues(course({ examen: { ...EXAM_DEFAULTS, titulo: "Examen final", preguntas: [q({ opciones: ["A", ""], correctas: [] })] } }));
    expect(p).toEqual(["Cierre · Examen final: la pregunta 1 necesita al menos dos opciones y una correcta"]);
  });
});

describe("gradableQuestions", () => {
  it("convierte om, vf y rm y deja fuera relacionar y abierta", () => {
    const r = gradableQuestions([q({}), q({ tipo: "vf", opciones: [], correctas: [1] }), q({ tipo: "rel" }), q({ tipo: "ab" }), q({ tipo: "rm", correctas: [0, 1] })]);
    expect(r.map((x) => x.t)).toEqual(["om", "vf", "rm"]);
    expect(r[1]!.o).toEqual(["Verdadero", "Falso"]);
  });
});
