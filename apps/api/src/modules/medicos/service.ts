/* Verificación de cédulas profesionales (se valida en la consulta pública de la SEP). */
import type { CedulaVerification } from "@kiron/shared";
import { db } from "../../store";
import { conflict, notFound } from "../../lib/http";
import { awardRule } from "../club/service";

export const listVerifications = async (): Promise<CedulaVerification[]> => db().verificaciones;

export const approveVerification = async (id: number): Promise<CedulaVerification> => {
  const v = db().verificaciones.find((x) => x.id === id);
  if (!v) throw notFound("Médico no encontrado");
  if (v.verificado) throw conflict("Esta cédula ya está verificada");
  v.verificado = true;
  awardRule(v.nombre, "cedula", "Cédula verificada");
  return v;
};
