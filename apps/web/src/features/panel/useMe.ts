/* Sesión de demo desde la API (GET /api/sesion): usuario y saldo de puntos del médico.
   La usan el menú de usuario del encabezado, el mock del panel en el inicio y el panel.
   refreshMe() vuelve a pedirla después de una acción que cambia los puntos (lección, examen, canje, asistencia). */
import { useEffect } from "react";
import type { MeResponse } from "@kiron/shared";
import { useApi } from "../../lib/api";
import { createStore, useStore } from "../../state/createStore";
import { useSession } from "../../state/session";

const meVersion = createStore(0);

export const refreshMe = (): void => meVersion.set((v) => v + 1);

export function useMe(): MeResponse | undefined {
  const { role } = useSession();
  const version = useStore(meVersion);
  const { data, refetch } = useApi<MeResponse>(role ? "/api/sesion" : null);
  useEffect(() => {
    if (version) refetch();
  }, [version, refetch]);
  return role ? data : undefined;
}

/* Puntos del médico (null si no hay sesión de médico o aún no llegan). */
export function useMyPoints(): number | null {
  const me = useMe();
  return me?.rol === "mvz" && typeof me.puntos === "number" ? me.puntos : null;
}
