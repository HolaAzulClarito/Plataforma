/* Pestaña Ajustes: ajustes globales de la academia (gs() y APP.gsSet). Aplican a todos los cursos por igual. */
import type { AcademySettings, SettingsUpdateRequest } from "@kiron/shared";
import { Icon } from "../../../components/Icon";
import { ApiStatus, Notice } from "../../../components/ui";
import { useT } from "../../../i18n";
import { apiPatch } from "../../../lib/api";
import { Switch, useAction, useAdminApi } from "../common";

type BoolKey = { [K in keyof AcademySettings]: AcademySettings[K] extends boolean ? K : never }[keyof AcademySettings];

const SWITCHES: Array<[BoolKey, string, string]> = [
  ["enfoque", "Modo enfoque", "Oculta el menú y el pie de página mientras el alumno toma la lección."],
  ["resumen", "Resumen del contenido", "Muestra el temario resumido en la página del curso antes de inscribirse."],
  ["adminSinInsc", "Acceso de administradores sin inscripción", "El equipo puede recorrer cualquier curso sin inscribirse. No se guarda avance."],
  ["login", "Ver cursos solo con sesión iniciada", "Si está activo, el temario y los detalles del curso se ven solo con cuenta."],
  ["expira", "Expiración de la inscripción", "Si está activo, la inscripción vence en la fecha límite del grupo al que pertenece el alumno."],
  ["ocultar", "Ocultar al alumno el detalle de sus intentos", "El alumno ve solo su calificación final, nunca qué preguntas acertó o falló ni las respuestas correctas."],
];

export function AjustesTab() {
  const t = useT();
  const { data: G, loading, error, refetch } = useAdminApi<AcademySettings>("/admin/academia/ajustes");
  const { busy, run } = useAction();
  const set = (k: BoolKey, v: boolean) => {
    const body: SettingsUpdateRequest = { [k]: v };
    void run(() => apiPatch<AcademySettings>("/admin/academia/ajustes", body), "Ajuste guardado para todos los cursos");
  };
  return (
    <>
      <Notice style={{ marginBottom: 18 }}>{t("Estos ajustes aplican a todos los cursos por igual. No hay configuración por curso.")}</Notice>
      <ApiStatus loading={loading && !G} error={error} onRetry={refetch} />
      {G ? (
        <div className="panel set-list">
          <div className="set-row">
            <div>
              <b>{t("Modo de finalización")}</b>
              <small>
                {t(
                  "Siempre estricto. La constancia se emite solo si el alumno vio todas las lecciones al 100 % y aprobó el examen final. Si termina las lecciones y reprueba el examen, no hay constancia.",
                )}
              </small>
            </div>
            <span className="badge badge-ok">
              <Icon name="lock" /> {t("Estricto")}
            </span>
          </div>
          <div className="set-row">
            <div>
              <b>{t("Avance de lección")}</b>
              <small>{t("La lección se completa sola al reproducir el 100 % del video. El alumno no puede marcarla a mano y no existe ninguna función que lo permita.")}</small>
            </div>
            <span className="badge badge-ok">
              <Icon name="lock" /> {t("100 % del video")}
            </span>
          </div>
          {SWITCHES.map(([k, title, desc]) => (
            <div className="set-row" key={k}>
              <div>
                <b id={`gs-${k}`}>{t(title)}</b>
                <small>{t(desc)}</small>
              </div>
              <Switch on={G[k]} label={title} onToggle={() => set(k, !G[k])} disabled={busy} />
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
