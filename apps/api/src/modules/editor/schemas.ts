import { z } from "zod";
import { CourseStateSchema, EditorQuestionSchema, ExamConfigSchema, imageDataUrl, optionalIsoDate, required, text } from "../../lib/schemas";
import { MAX_ATTACHMENT_BYTES, MAX_LESSONS_PER_MODULE, MAX_MODULES, MAX_QUESTIONS } from "./service";

const price = z.number().int().min(0).max(1_000_000);
const Kind = z.enum(["Curso", "Diplomado"]);
const Level = z.enum(["Todos los niveles", "Básico", "Intermedio", "Avanzado"]);
const Cover = imageDataUrl(["jpeg", "png", "webp"], 2 * 1024 * 1024);

export const CourseParam = z.object({ id: z.string().regex(/^[a-f0-9]{1,20}$/) });
export const ModuleParam = CourseParam.extend({ mi: z.coerce.number().int().min(0).max(MAX_MODULES - 1) });
export const LessonParam = ModuleParam.extend({ li: z.coerce.number().int().min(0).max(MAX_LESSONS_PER_MODULE - 1) });
export const AttachmentParam = LessonParam.extend({ k: z.coerce.number().int().min(0).max(99) });
export const QuestionParam = CourseParam.extend({ qi: z.coerce.number().int().min(0).max(MAX_QUESTIONS - 1) });

export const CreateBody = z.object({
  titulo: required(140),
  tituloEn: required(140),
  tipo: Kind,
  categoria: required(120),
  instructor: required(120),
  nivel: Level,
  precioRegular: price,
  precio: price,
  modulos: z
    .array(z.object({ nombre: required(120), lecciones: z.number().int().min(1).max(MAX_LESSONS_PER_MODULE) }))
    .min(1)
    .max(MAX_MODULES),
  portada: Cover.nullish(),
});

export const UpdateBody = z.object({
  titulo: required(140).optional(),
  tituloEn: required(140).optional(),
  descripcion: text(20_000).optional(),
  tipo: Kind.optional(),
  categoria: required(120).optional(),
  nivel: Level.optional(),
  instructor: required(120).optional(),
  precioRegular: price.optional(),
  precio: price.optional(),
  estado: CourseStateSchema.optional(),
  fechaProg: optionalIsoDate.optional(),
  portada: Cover.nullish(),
});

export const LessonBody = z.object({
  titulo: required(120).optional(),
  video: text(500).optional(),
  dur: text(9).optional(),
  desbloqueo: optionalIsoDate.optional(),
});

export const AttachmentBody = z.object({ nombre: required(120), tam: z.number().int().min(1).max(MAX_ATTACHMENT_BYTES) });

export const ExamBody = ExamConfigSchema.partial().extend({ titulo: required(120).optional() });

export const ExamImportBody = z.object({
  formato: z.literal("kiron-examen"),
  version: z.literal(1),
  titulo: text(120).default(""),
  ajustes: z.unknown().optional(),
  preguntas: z.array(EditorQuestionSchema).max(MAX_QUESTIONS),
});

export { EditorQuestionSchema };
