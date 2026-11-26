import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PRODUCTS } from "../../test/fixtures";
import { mockFetch, renderApp } from "../../test/utils";
import { ALL, countByCat, filterFromParams, filterProducts, type CatalogFilter } from "./catalog";

const base: CatalogFilter = { cat: ALL, q: "", sort: "rel" };
const names = (f: Partial<CatalogFilter>) => filterProducts(PRODUCTS, { ...base, ...f }).map((p) => p.slug);

describe("filtro del catálogo", () => {
  it("filtra por clasificación", () => {
    expect(names({ cat: "Oftálmicos" })).toEqual(["kiroftal", "vibix"]);
    expect(countByCat(PRODUCTS, "Oftálmicos")).toBe(2);
    expect(countByCat(PRODUCTS, ALL)).toBe(PRODUCTS.length);
  });

  it("busca sin acentos ni mayúsculas en nombre, clasificación, principio activo e indicaciones", () => {
    expect(names({ q: "oftalmicos" })).toEqual(["kiroftal", "vibix"]);
    expect(names({ q: "ANTISEPTICO" })).toEqual(["antiseptico"]);
    expect(names({ q: "ciclosporina" })).toEqual(["kiroftal"]);
    expect(names({ q: "nematodos" })).toEqual(["kir-anthel"]);
    expect(names({ q: "no existe" })).toEqual([]);
  });

  it("combina búsqueda y clasificación y ordena por nombre o novedades", () => {
    expect(names({ q: "kir", cat: "Endoparasiticidas" })).toEqual(["kir-anthel"]);
    expect(names({ sort: "az" })[0]).toBe("antiseptico");
    const nuevos = filterProducts(PRODUCTS, { ...base, sort: "new" }).slice(0, 2);
    expect(nuevos.every((p) => p.isNew)).toBe(true);
  });

  it("lee ?cat, ?q y ?focus como el demo", () => {
    const last: CatalogFilter = { cat: "Oftálmicos", q: "vibix", sort: "az" };
    expect(filterFromParams(new URLSearchParams("cat=Biológicos"), last)).toEqual({ cat: "Biológicos", q: "", sort: "az" });
    expect(filterFromParams(new URLSearchParams("q=kir"), last)).toEqual({ cat: ALL, q: "kir", sort: "az" });
    expect(filterFromParams(new URLSearchParams("focus=1"), last)).toEqual(last);
    expect(filterFromParams(new URLSearchParams(""), last)).toEqual({ cat: ALL, q: "", sort: "az" });
  });
});

describe("página /productos", () => {
  it("muestra los productos de la API y anuncia el conteo con aria-live", async () => {
    mockFetch();
    renderApp("/productos");
    const count = await screen.findByText(`${PRODUCTS.length} productos`);
    expect(count.closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
    expect(within(document.getElementById("pgrid")!).getAllByRole("link")).toHaveLength(PRODUCTS.length);
  });

  it("filtra al escribir y al elegir una clasificación; muestra el estado vacío", async () => {
    mockFetch();
    renderApp("/productos");
    await screen.findByText(`${PRODUCTS.length} productos`);
    fireEvent.change(screen.getByRole("textbox", { name: "Buscar productos" }), { target: { value: "oftalmicos" } });
    expect(document.getElementById("rcount")).toHaveTextContent("2 productos para “oftalmicos”");
    fireEvent.click(screen.getByRole("radio", { name: /Endoparasiticidas/ }));
    expect(screen.getByText(/No encontramos productos con ese criterio/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "limpia los filtros" }));
    await waitFor(() => expect(document.getElementById("rcount")).toHaveTextContent(`${PRODUCTS.length} productos`));
  });

  it("aplica ?cat desde la URL", async () => {
    mockFetch();
    renderApp(`/productos?cat=${encodeURIComponent("Oftálmicos")}`);
    await waitFor(() => expect(document.getElementById("rcount")).toHaveTextContent("2 productos en Oftálmicos"));
    expect(screen.getByRole("radio", { name: /Oftálmicos/ })).toBeChecked();
  });
});
