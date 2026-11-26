import { z } from "zod";
import { youtubeId } from "@kiron/shared";
import { imageDataUrl, isoDate, required, slug, text } from "../../lib/schemas";

export const WebinarCreateBody = z
  .object({
    titulo: required(120),
    tituloEn: required(120),
    subtitulo: text(160).optional(),
    subtituloEn: text(160).optional(),
    grado: z.enum(["MVZ", "Dr.", "Dra.", "M. en C.", "Esp."]),
    ponente: required(120),
    fecha: isoDate,
    hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    duracion: z.union([z.literal(60), z.literal(90), z.literal(120)]),
    umbral: z.number().int().min(1).max(120),
    slug: slug.max(60),
    modo: z.enum(["cloudflare", "youtube"]),
    youtube: text(300).optional(),
    publicado: z.boolean(),
    flyer: imageDataUrl(["jpeg", "png", "webp"], 2 * 1024 * 1024).nullish(),
  })
  .refine((w) => w.modo !== "youtube" || !!youtubeId(w.youtube), { path: ["youtube"], message: "Enlace de YouTube no válido" });
