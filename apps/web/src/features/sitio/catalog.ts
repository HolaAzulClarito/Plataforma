/* Filtro, búsqueda y orden del catálogo (renderGrid del demo). Funciones puras. */
import { normalize, type Product } from "@kiron/shared";

export const ALL = "Todos";
export type CatalogSort = "rel" | "az" | "new";

export interface CatalogFilter {
  cat: string;
  q: string;
  sort: CatalogSort;
}

/* Busca sin acentos ni mayúsculas en nombre, clasificación, principio activo e indicaciones. */
export function filterProducts(products: readonly Product[], { cat, q, sort }: CatalogFilter): Product[] {
  const nq = normalize(q.trim());
  let list = products.filter(
    (p) =>
      (cat === ALL || p.cat === cat) &&
      (!nq || normalize([p.name, p.cat, p.active ?? "", (p.indications ?? []).join(" ")].join(" ")).includes(nq)),
  );
  if (sort === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
  if (sort === "new") list = [...list].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
  return list;
}

export const countByCat = (products: readonly Product[], cat: string): number =>
  cat === ALL ? products.length : products.filter((p) => p.cat === cat).length;

/* Estado inicial a partir de la URL, con las reglas del demo:
   ?cat=X -> categoría X y sin búsqueda; ?q=Y -> búsqueda Y en todas; sin cat/q/focus -> todo limpio;
   solo ?focus=1 -> conserva el último filtro de la sesión. */
export function filterFromParams(params: URLSearchParams, last: CatalogFilter): CatalogFilter {
  if (params.has("cat")) return { ...last, cat: params.get("cat") || ALL, q: "" };
  if (params.has("q")) return { ...last, q: params.get("q") ?? "", cat: ALL };
  if (params.has("focus")) return last;
  return { ...last, cat: ALL, q: "" };
}

/* "12 productos para “vibix” en Oftálmicos" (en español; se traduce por partes). */
export function resultParts(n: number, q: string, cat: string): { count: string; query: string; inCat: string } {
  return {
    count: `${n} producto${n === 1 ? "" : "s"}`,
    query: q ? q : "",
    inCat: cat !== ALL ? cat : "",
  };
}
