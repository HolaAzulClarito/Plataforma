/* Lecturas del catálogo y la red comercial (sección "Catálogo" de packages/shared/src/api.ts). */
import { useEffect } from "react";
import type { CatalogResponses } from "@kiron/shared";
import { useApi } from "../../lib/api";
import { setI18nCategories } from "../../i18n";

export const useProductos = () => useApi<CatalogResponses["productos"]>("/productos");
export const useProducto = (slug: string) => useApi<CatalogResponses["producto"]>(`/productos/${encodeURIComponent(slug)}`);
export const useRepresentantes = () => useApi<CatalogResponses["representantes"]>("/representantes");
export const useDistribuidores = () => useApi<CatalogResponses["distribuidores"]>("/distribuidores");
export const usePaises = () => useApi<CatalogResponses["paises"]>("/paises");
export const useVideos = () => useApi<CatalogResponses["videos"]>("/videos");
export const useWebinarProximo = () => useApi<CatalogResponses["webinarProximo"]>("/webinars/proximo");
export const useCursos = () => useApi<CatalogResponses["cursos"]>("/cursos");

/* Categorías del catálogo. También las registra en i18n para la regla "Ver <categoría>". */
export function useCategorias() {
  const res = useApi<CatalogResponses["categorias"]>("/categorias");
  useEffect(() => {
    if (res.data) setI18nCategories(res.data);
  }, [res.data]);
  return res;
}
