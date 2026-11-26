import { describe, expect, it } from "vitest";
import { inRange, isoToMx, ivaLabel, money, mxToIso, slugify, todayMx, youtubeId } from "./format";

describe("formatos", () => {
  it("money usa separador de miles de México y MXN", () => {
    expect(money(2999)).toBe("$2,999 MXN");
  });
  it("ivaLabel no afirma el IVA mientras no se confirme", () => {
    expect(ivaLabel()).toBe("IVA por confirmar");
    expect(ivaLabel("incluido")).toBe("IVA incluido");
  });
  it("convierte fechas DD/MM/AAAA <-> AAAA-MM-DD", () => {
    expect(mxToIso("15/12/2026")).toBe("2026-12-15");
    expect(isoToMx("2026-12-15")).toBe("15/12/2026");
    expect(mxToIso("2026-12-15")).toBe("");
    expect(todayMx(new Date(2026, 10, 26))).toBe("26/11/2026");
  });
  it("inRange filtra por últimos días y año", () => {
    const now = new Date(2026, 10, 26, 12);
    expect(inRange("20/11/2026", "7", now)).toBe(true);
    expect(inRange("01/10/2026", "30", now)).toBe(false);
    expect(inRange("01/01/2026", "anio", now)).toBe(true);
    expect(inRange("01/01/2020", "", now)).toBe(true);
  });
  it("slugify quita acentos y símbolos", () => {
    expect(slugify("¿Antojo, hábito o problema?")).toBe("antojo-habito-o-problema");
  });
  it("youtubeId reconoce los formatos comunes", () => {
    expect(youtubeId("https://youtu.be/7cYE999nfe8")).toBe("7cYE999nfe8");
    expect(youtubeId("https://www.youtube.com/watch?v=7cYE999nfe8&t=3")).toBe("7cYE999nfe8");
    expect(youtubeId("https://example.com")).toBeNull();
  });
});
