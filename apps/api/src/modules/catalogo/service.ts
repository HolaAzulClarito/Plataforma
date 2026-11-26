/* Catálogo y red comercial: datos reales de kironmexico.com, solo lectura. */
import type { CountriesResponse, Distributor, Product, ProductDetail, RepsResponse, Video } from "@kiron/shared";
import { db } from "../../store";
import { notFound } from "../../lib/http";

export const listCategories = async (): Promise<string[]> => db().categorias;
export const listProducts = async (): Promise<Product[]> => db().productos;

/* Relacionados declarados o, si no hay, hasta 4 de la misma categoría. */
export const productDetail = async (slug: string): Promise<ProductDetail> => {
  const all = db().productos;
  const product = all.find((p) => p.slug === slug);
  if (!product) throw notFound("Producto no encontrado");
  const declared = (product.related ?? []).map((s) => all.find((p) => p.slug === s)).filter((p): p is Product => !!p);
  const related = declared.length ? declared : all.filter((p) => p.cat === product.cat && p.slug !== slug).slice(0, 4);
  return { product, related };
};

export const listReps = async (): Promise<RepsResponse> => db().representantes;
export const listDistributors = async (): Promise<Distributor[]> => db().distribuidores;
export const listCountries = async (): Promise<CountriesResponse> => db().paises;
export const listVideos = async (): Promise<Video[]> => db().videos;
