/* Hallazgo 15: el diccionario en inglés se carga con import() solo al pedir inglés; el español no espera nada y,
   mientras carga, la interfaz sigue en español (sin textos a medias) con aria-busy en <html>. */
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("carga diferida del inglés", () => {
  it("en español no carga el diccionario; al cambiar a inglés sigue en español hasta que llega y luego cambia", async () => {
    vi.resetModules();
    const engine = await import("./engine");
    const { I18nProvider, useT } = await import("./I18nProvider");
    const { session } = await import("../state/session");
    expect(engine.isEnglishReady()).toBe(false);
    function Probe() {
      const t = useT();
      return <p>{t("Productos")}</p>;
    }
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByText("Productos")).toBeInTheDocument();
    expect(engine.isEnglishReady()).toBe(false);
    act(() => session.setLang("en"));
    expect(screen.getByText("Productos")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("aria-busy");
    expect(engine.getMissing()).toEqual([]);
    expect(await screen.findByText("Products")).toBeInTheDocument();
    expect(document.documentElement).not.toHaveAttribute("aria-busy");
    expect(document.documentElement.lang).toBe("en");
    act(() => session.setLang("es"));
  });
});
