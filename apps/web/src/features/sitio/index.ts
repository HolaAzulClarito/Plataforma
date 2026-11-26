/* Feature: sitio público (inicio, catálogo, ficha, red comercial, videoteca, farmacovigilancia, legales, 404). */
export { Home, PanelMock, type PanelMockStats } from "./Home";
export { Catalogo } from "./Catalogo";
export { Producto, fichaTecnica, fichaPdf } from "./Producto";
export { Representantes, Distribuidores } from "./Red";
export { Videoteca, Recetas, playVideo, playRecipe } from "./Videoteca";
export { Farmacovigilancia, Legal } from "./Paginas";
export { NotFound } from "./NotFound";
export * from "./data";
export { filterProducts, countByCat, filterFromParams, ALL as ALL_CATEGORIES, type CatalogFilter, type CatalogSort } from "./catalog";
