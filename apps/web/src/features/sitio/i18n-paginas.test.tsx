import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { clearMissing, getMissing } from "../../i18n";
import { session } from "../../state/session";
import { mockFetch, renderApp } from "../../test/utils";

const ROUTES = [
  "/",
  "/productos",
  "/productos?q=zzz",
  "/productos?cat=Oftálmicos",
  "/producto/kiroftal",
  "/producto/no-existe",
  "/representantes",
  "/distribuidores/mexico",
  "/distribuidores/mundo",
  "/videoteca",
  "/videoteca?tab=tutoriales",
  "/videoteca?tab=cursos",
  "/videoteca?tab=webinars",
  "/recetas-cuantificadas",
  "/farmacovigilancia",
  "/legal/privacidad",
  "/legal/condiciones",
  "/ruta-que-no-existe",
];

const settle = () => act(() => new Promise((r) => setTimeout(r, 60)));

describe("sitio público en inglés", () => {
  it("todas las páginas tienen traducción para sus textos fijos", async () => {
    const missing = new Set<string>();
    for (const path of ROUTES) {
      session.reset();
      session.setLang("en");
      clearMissing();
      mockFetch();
      const { unmount } = renderApp(path);
      await settle();
      getMissing().forEach((m) => missing.add(`${m}  (${path})`));
      unmount();
    }
    expect([...missing]).toEqual([]);
  }, 30_000);

  it("los modales de inicio de sesión y ficha técnica tienen traducción", async () => {
    session.setLang("en");
    mockFetch();
    clearMissing();
    renderApp("/producto/kiroftal");
    await screen.findByRole("heading", { level: 1, name: "KirOftal Gotas" });
    fireEvent.click(screen.getAllByRole("button", { name: /Sign in/ })[0]!);
    fireEvent.click(screen.getByRole("tab", { name: "Create account" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    act(() => session.login("mvz"));
    fireEvent.click(screen.getByRole("button", { name: /Product data sheet/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(getMissing()).toEqual([]);
  });

  it("el registro al webinar confirma con un modal traducido", async () => {
    session.setLang("en");
    session.login("mvz");
    mockFetch();
    clearMissing();
    renderApp("/");
    await settle();
    fireEvent.click(screen.getAllByRole("button", { name: /Register/ })[0]!);
    expect(screen.getByRole("dialog", { name: "Registration confirmed" })).toBeInTheDocument();
    expect(getMissing()).toEqual([]);
  });
});
