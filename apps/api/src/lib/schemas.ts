/* Esquemas Zod reutilizables. Todo input se valida con longitudes máximas y rangos. */
import { z } from "zod";

export const text = (max: number) => z.string().trim().max(max);
export const required = (max: number) => z.string().trim().min(1).max(max);

export const slug = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const SlugParam = z.object({ slug });
export const IdParam = z.object({ id: z.coerce.number().int().min(1).max(1_000_000) });

/* Fecha ISO AAAA-MM-DD válida. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(new Date(s + "T12:00:00Z").getTime()) && new Date(s + "T12:00:00Z").toISOString().startsWith(s), "Fecha inválida");

export const optionalIsoDate = z.union([z.literal(""), isoDate]);

export const DateRangeSchema = z.enum(["", "7", "30", "anio"]);

export const CourseStateSchema = z.enum(["publicado", "borrador", "programado", "privado", "papelera"]);
export const EnrollmentStateSchema = z.enum(["approved", "pending", "cancelled"]);
export const QuestionTypeSchema = z.enum(["om", "vf", "rm", "rel", "ab"]);

/* Imagen como data URL base64 con tipo y peso máximo. */
export const imageDataUrl = (mimes: readonly string[], maxBytes: number) =>
  z
    .string()
    .max(Math.ceil((maxBytes * 4) / 3) + 64)
    .regex(new RegExp(`^data:image/(${mimes.join("|")});base64,[A-Za-z0-9+/]+={0,2}$`))
    .refine((s) => Math.floor(((s.length - s.indexOf(",") - 1) * 3) / 4) <= maxBytes, "La imagen pesa demasiado");

export const ExamConfigSchema = z.object({
  aprobatoria: z.number().int().min(1).max(100),
  intentos: z.number().int().min(0).max(20),
  tiempo: z.number().int().min(0).max(300),
  maxPreg: z.number().int().min(0).max(200),
  desbloqueo: optionalIsoDate,
  layout: z.enum(["una", "todas"]),
  orden: z.enum(["aleatorio", "fijo"]),
  lcAbierta: z.number().int().min(100).max(10000),
  retro: z.enum(["defecto", "revelar", "reintentar"]),
  calculo: z.enum(["mas_alta", "promedio", "primer_intento", "ultimo_intento"]),
});

export const EditorQuestionSchema = z.object({
  tipo: QuestionTypeSchema,
  texto: text(600).default(""),
  puntos: z.number().int().min(1).max(10).default(1),
  requerida: z.boolean().default(true),
  mezclar: z.boolean().default(false),
  explicacion: text(400).default(""),
  opciones: z.array(text(200)).max(10).default([]),
  correctas: z.array(z.number().int().min(0).max(9)).max(10).default([]),
  pares: z.array(z.tuple([text(160), text(160)])).max(8).default([]),
  modelo: text(2000).default(""),
});
