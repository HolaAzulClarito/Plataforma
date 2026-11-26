import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodType } from "zod";

/* Error de negocio con estado HTTP. onError lo convierte en { error, ...extra }. */
export class HttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    message: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export const notFound = (msg = "No encontrado") => new HttpError(404, msg);
export const conflict = (msg: string, extra?: Record<string, unknown>) => new HttpError(409, msg, extra);
export const forbidden = (msg: string) => new HttpError(403, msg);
export const badRequest = (msg: string) => new HttpError(400, msg);

/* Validación Zod con respuesta uniforme. Solo se devuelven las rutas de los campos inválidos, nunca el valor recibido. */
export const v = <T extends ZodType, Target extends keyof ValidationTargets>(target: Target, schema: T) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const campos = [...new Set(result.error.issues.map((i) => i.path.map(String).join(".") || target))];
      return c.json({ error: "Datos inválidos", campos }, 400);
    }
  });
