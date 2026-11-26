import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "../app/layouts/Footer";
import { Header } from "../app/layouts/Header";
import { session } from "../state/session";
import { renderWithProviders } from "../test/utils";
import { clearMissing, getMissing, setI18nCategories, translate, translateTo } from "./engine";

describe("motor de traducción (paridad con legacy/assets/js/i18n.js)", () => {
  it("traduce por diccionario exacto y conserva los espacios alrededor", () => {
    expect(translate("Productos")).toBe("Products");
    expect(translate("  Productos ")).toBe("  Products ");
  });

  it("aplica reglas con expresión regular", () => {
    expect(translate("12 productos")).toBe("12 products");
    expect(translate("Tutorial 3")).toBe("Tutorial 3");
  });

  it("aplica reglas con función, incluida la que usa las categorías del catálogo", () => {
    setI18nCategories(["Oftálmicos"]);
    expect(translate("Ver oftálmicos")).toBe("See ophthalmics");
    expect(translate("Ver algo que no es categoría")).toBeNull();
  });

  it("traduce por partes los textos unidos con ' · '", () => {
    expect(translate("Catálogo · KirOftal Gotas")).toBe("Catalog · KirOftal Gotas");
  });

  it("en español devuelve el texto tal cual y no registra faltantes", () => {
    clearMissing();
    expect(translateTo("es", "Texto que no existe")).toBe("Texto que no existe");
    expect(getMissing()).toEqual([]);
  });

  it("en inglés registra los textos sin traducción y deja pasar números y símbolos", () => {
    clearMissing();
    expect(translateTo("en", "Texto inventado sin traducción")).toBe("Texto inventado sin traducción");
    expect(translateTo("en", "55 5112 7743")).toBe("55 5112 7743");
    expect(getMissing()).toEqual(["Texto inventado sin traducción"]);
  });
});

describe("textos fijos del layout", () => {
  const renderLayout = () =>
    renderWithProviders(
      <>
        <Header />
        <Footer />
      </>,
    );

  it("todos tienen traducción al inglés sin sesión (encabezado, menús, menú móvil, demo y pie)", () => {
    session.setLang("en");
    clearMissing();
    renderLayout();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(getMissing()).toEqual([]);
    expect(screen.getAllByText("Products").length).toBeGreaterThan(0);
    expect(screen.getByText("Clickable prototype · Azul Clarito.")).toBeInTheDocument();
  });

  it("todos tienen traducción al inglés con sesión de médico y de administrador (menú de usuario)", () => {
    session.setLang("en");
    session.login("mvz");
    clearMissing();
    renderLayout();
    fireEvent.click(screen.getByRole("button", { name: "My account" }));
    act(() => session.login("admin"));
    expect(getMissing()).toEqual([]);
  });
});
