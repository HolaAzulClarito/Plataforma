/* Páginas del sitio (contenido de ejemplo). */
import type { PageCreateRequest, PageUpdateRequest, SitePage } from "@kiron/shared";
import { db, nextId } from "../../store";
import { hoyMx } from "../../lib/clock";
import { conflict, notFound } from "../../lib/http";

const DEFAULT_BLOCKS = ["Héroe", "Texto", "Productos destacados", "Formulario"];

const pageOf = (id: number): SitePage => {
  const p = db().paginas.find((x) => x.id === id);
  if (!p) throw notFound("Página no encontrada");
  return p;
};

const assertFreeUrl = (url: string, id?: number) => {
  if (db().paginas.some((p) => p.url === url && p.id !== id)) throw conflict("Ya existe una página con esa URL");
};

export const listPages = async (): Promise<SitePage[]> => db().paginas;

export const createPage = async (b: PageCreateRequest): Promise<SitePage> => {
  assertFreeUrl(b.url);
  const p: SitePage = {
    id: nextId(db().paginas),
    titulo: b.titulo,
    url: b.url,
    estado: "Borrador",
    edicion: hoyMx(),
    bloques: b.bloques ?? DEFAULT_BLOCKS,
    seo: { titulo: `${b.titulo} · Kirón`, descripcion: "Laboratorio veterinario mexicano", idioma: "es" },
  };
  db().paginas.push(p);
  return p;
};

export const updatePage = async (id: number, b: PageUpdateRequest): Promise<SitePage> => {
  const p = pageOf(id);
  if (b.url) assertFreeUrl(b.url, id);
  Object.assign(p, b, { edicion: hoyMx() });
  return p;
};

/* En la plataforma se guarda la versión anterior antes de publicar. */
export const publishPage = async (id: number): Promise<SitePage> => {
  const p = pageOf(id);
  p.estado = "Publicada";
  p.edicion = hoyMx();
  return p;
};
