import { todayIso, todayMx } from "@kiron/shared";

/* Reloj de la API. Los tests lo fijan con setClock para probar fechas de desbloqueo y tiempo límite. */
let override: (() => Date) | null = null;

export const now = (): Date => (override ? override() : new Date());
export const setClock = (fn: (() => Date) | null): void => {
  override = fn;
};
export const hoyMx = (): string => todayMx(now());
export const hoyIso = (): string => todayIso(now());
