/* Tablero del administrador. Las cifras de uso son de ejemplo (no hay analítica real en la etapa 1). */
import { csvDocument, type Dashboard } from "@kiron/shared";
import { db } from "../../store";

export const dashboard = async (): Promise<Dashboard> => {
  const s = db();
  return {
    ejemplo: true,
    kpis: s.tablero.kpis,
    asistentesPorMes: s.tablero.asistentesPorMes,
    cedulasPendientes: s.verificaciones.filter((v) => !v.verificado).length,
    inscripcionesPendientes: s.inscripciones.filter((e) => e.st === "pending").length,
  };
};

export const dashboardCsv = async (): Promise<string> =>
  csvDocument([["Indicador", "Valor"], ...db().tablero.kpis.map((k) => [k.nombre, k.valor])]);
