/* Pestaña Automatizaciones (APP.autoToggle, APP.autoPreview). */
import type { Automation, AutomationList, AutomationUpdateRequest } from "@kiron/shared";
import { Icon } from "../../../components/Icon";
import { ApiStatus, Notice } from "../../../components/ui";
import { useT } from "../../../i18n";
import { apiPatch } from "../../../lib/api";
import { cx } from "../../../lib/cx";
import { openModal } from "../../../state/modal";
import { Switch, useAction, useAdminApi } from "../common";

function Preview({ a }: { a: Automation }) {
  const t = useT();
  return (
    <div className="modal-b">
      <p style={{ color: "var(--muted)", marginBottom: 12 }}>{t(a.disparador)}</p>
      <div className="mail-prev">
        <small>
          {t("Asunto")}: {t(a.nombre)} · {t("Academia Kirón")}
        </small>
        <p>{t(a.mensaje)}</p>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12 }}>{t("Los campos entre llaves se llenan con los datos de cada alumno.")}</p>
    </div>
  );
}

function AutoCard({ a }: { a: Automation }) {
  const t = useT();
  const { busy, run } = useAction();
  const toggle = (k: keyof AutomationUpdateRequest) => run(() => apiPatch<Automation>(`/admin/academia/automatizaciones/${a.id}`, { [k]: !a[k] }));
  return (
    <div className={cx("panel auto", !a.activa && "off")}>
      <div className="auto-h">
        <div>
          <b>{t(a.nombre)}</b>
          <small>{t(a.disparador)}</small>
        </div>
        <Switch on={a.activa} label={`Activar · ${a.nombre}`} onToggle={() => toggle("activa")} disabled={busy} />
      </div>
      <div className="auto-f">
        <button type="button" className={cx("chip-t", a.correo && "on")} aria-pressed={a.correo} disabled={busy} onClick={() => toggle("correo")}>
          <Icon name="mail" /> {t("Correo")}
        </button>
        <button type="button" className={cx("chip-t", a.panel && "on")} aria-pressed={a.panel} disabled={busy} onClick={() => toggle("panel")}>
          <Icon name="bell" /> {t("Aviso en el panel")}
        </button>
        <span className="grow" />
        <button type="button" className="mini" onClick={() => openModal({ title: a.nombre, content: <Preview a={a} />, size: "sm" })} aria-label={`${t("Ver mensaje")} · ${t(a.nombre)}`}>
          <Icon name="eye" /> {t("Ver mensaje")}
        </button>
      </div>
    </div>
  );
}

export function AutomatizacionesTab() {
  const t = useT();
  const { data, loading, error, refetch } = useAdminApi<AutomationList>("/admin/academia/automatizaciones");
  return (
    <>
      <Notice style={{ marginBottom: 18 }}>{t("Los avisos salen solos por correo y como notificación en el panel del médico. WhatsApp se queda como botón de contacto en el sitio.")}</Notice>
      <ApiStatus loading={loading && !data} error={error} onRetry={refetch} />
      <div className="auto-list">{data?.map((a) => <AutoCard key={a.id} a={a} />)}</div>
    </>
  );
}
