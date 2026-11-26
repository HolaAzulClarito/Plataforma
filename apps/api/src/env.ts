import { z } from "zod";

/* Variables de entorno validadas al arrancar. Si falta una obligatoria, el proceso no arranca. */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),
});

export const env = EnvSchema.parse(process.env);
