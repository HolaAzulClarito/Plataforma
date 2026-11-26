import { z } from "zod";
import { CourseStateSchema, DateRangeSchema, isoDate, text } from "../../lib/schemas";

export const PublicCoursesQuery = z.object({ todos: z.enum(["0", "1"]).optional() });

export const AdminCoursesQuery = z.object({
  estado: z.union([CourseStateSchema, z.literal("todos")]).optional(),
  cat: text(120).optional(),
  q: text(120).optional(),
  rango: DateRangeSchema.optional(),
});

export const CourseStateBody = z.object({ estado: CourseStateSchema, fecha: isoDate.optional() });

export const CourseBulkBody = z.object({
  claves: z
    .array(z.string().regex(/^(s:[a-z0-9-]{1,80}|n:[a-f0-9]{1,20})$/))
    .min(1)
    .max(500),
  estado: CourseStateSchema,
});
