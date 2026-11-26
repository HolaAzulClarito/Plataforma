import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getSession } from "../state/session";
import { mockFetch, renderApp } from "../test/utils";
import { legacyHashToPath, redirectTarget, resolveAlias } from "./redirects";
import { titleFor } from "./RouteEffects";

const where = () => screen.getByTestId("location").textContent;

describe("enlaces viejos con #/ y alias", () => {
  it("convierte /#/ruta en /ruta y conserva la query", () => {
    expect(legacyHashToPath("#/productos?cat=Biol%C3%B3gicos")).toBe("/productos?cat=Biol%C3%B3gicos");
    expect(legacyHashToPath("#/")).toBe("/");
    expect(legacyHashToPath("#view")).toBeNull();
    expect(legacyHashToPath("")).toBeNull();
  });

  it("resuelve los alias del demo", () => {
    expect(resolveAlias("/consultorio")).toBe("/panel");
    expect(resolveAlias("/consultorio/cursos")).toBe("/panel/cursos");
    expect(resolveAlias("/videoteca-pets")).toBe("/videoteca");
    expect(resolveAlias("/distribuidores-mexico")).toBe("/distribuidores/mexico");
    expect(resolveAlias("/distribuidores-mundo")).toBe("/distribuidores/mundo");
    expect(resolveAlias("/distribuidores")).toBe("/distribuidores/mexico");
    expect(resolveAlias("/donde-comprar")).toBe("/representantes");
    expect(resolveAlias("/webinar")).toBe("/webinar/proximo");
    expect(resolveAlias("/webinar/")).toBe("/webinar/proximo");
    expect(resolveAlias("/webinar/proximo")).toBeNull();
    expect(resolveAlias("/productos")).toBeNull();
  });

  it("un hash viejo que apunta a un alias termina en la ruta canónica", () => {
    expect(redirectTarget("/", "", "#/consultorio/club")).toBe("/panel/club");
    expect(redirectTarget("/videoteca-pets", "?tab=tutoriales", "")).toBe("/videoteca?tab=tutoriales");
  });

  it("al abrir /#/producto/kiroftal la app navega a /producto/kiroftal", async () => {
    mockFetch();
    renderApp("/#/producto/kiroftal");
    await waitFor(() => expect(where()).toBe("/producto/kiroftal"));
    expect(await screen.findByRole("heading", { level: 1, name: "KirOftal Gotas" })).toBeInTheDocument();
  });

  it("/#/consultorio inicia la sesión simulada de médico y abre el panel", async () => {
    mockFetch();
    renderApp("/#/consultorio");
    await waitFor(() => expect(where()).toBe("/panel"));
    await waitFor(() => expect(getSession().role).toBe("mvz"));
  });

  it("/webinar sin slug redirige a /webinar/proximo (como el demo)", async () => {
    mockFetch();
    renderApp("/webinar");
    await waitFor(() => expect(where()).toBe("/webinar/proximo"));
    renderApp("/#/webinar");
    await waitFor(() => expect(screen.getAllByTestId("location").at(-1)!.textContent).toBe("/webinar/proximo"));
  });

  it("/admin sin sesión de administrador inicia la sesión simulada con ese rol", async () => {
    mockFetch();
    renderApp("/admin/academia/cursos");
    await waitFor(() => expect(getSession().role).toBe("admin"));
    expect(screen.queryByRole("contentinfo")).toBeNull();
  });
});

describe("título del documento por sección", () => {
  it("sigue el formato del demo", () => {
    expect(titleFor("/")).toBe("Kirón · Demo");
    expect(titleFor("/productos")).toBe("Productos · Kirón · Demo");
    expect(titleFor("/producto/x")).toBe("Producto · Kirón · Demo");
    expect(titleFor("/verificar/KI-2026-001234")).toBe("Verificar constancia · Kirón · Demo");
    expect(titleFor("/videoteca")).toBe("Kirón · Kirón · Demo");
  });

  it("se aplica al navegar", async () => {
    mockFetch();
    renderApp("/representantes");
    await waitFor(() => expect(document.title).toBe("Representantes · Kirón · Demo"));
  });
});
