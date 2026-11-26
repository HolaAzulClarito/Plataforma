/* Tablero (admin() del demo) y verificación de cédulas (verifPanel(), APP.verify). */
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import type { CedulaList, CedulaVerification, Dashboard } from "@kiron/shared";
import { Icon } from "../../components/Icon";
import { ApiStatus } from "../../components/ui";
import { useT } from "../../i18n";
import { apiPost } from "../../lib/api";
import { prefersReducedMotion } from "../../lib/motion";
import { toast } from "../../state/toasts";
import { downloadApiCsv, initialsOf, StateTag, useAction, useAdminApi } from "./common";
import { MainHead } from "./Shell";

function Bars({ data }: { data: Dashboard["asistentesPorMes"] }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const max = Math.max(1, ...data.map((m) => m.asistentes));
  /* Barras que crecen desde abajo (gsap.from del demo); sin animación con movimiento reducido. */
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const tw = gsap.from(el.children, { scaleY: 0, transformOrigin: "bottom", duration: 0.8, stagger: 0.06, ease: "power3.out" });
    return () => {
      tw.revert();
    };
  }, [data]);
  return (
    <div className="bars" id="bars" ref={ref}>
      {data.map((m) => {
        const label = `${t(m.mes)}: ${m.asistentes} ${t("asistentes")}`;
        return (
          <div key={m.mes} style={{ height: `${Math.round((m.asistentes / max) * 100)}%` }} tabIndex={0} title={label} aria-label={label}>
            <em>{m.asistentes}</em>
            <span>{t(m.mes)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function TableroPage() {
  const t = useT();
  const { data, loading, error, refetch } = useAdminApi<Dashboard>("/admin/tablero");
  const exportCsv = async () => {
    if (await downloadApiCsv("/admin/tablero?formato=csv", "tablero-kiron-demo.csv")) toast("Tablero exportado (cifras de ejemplo)");
  };
  return (
    <>
      <MainHead
        title="Tablero"
        sub="Uso de la plataforma · cifras de ejemplo"
        actions={
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv}>
            <Icon name="download" /> {t("Exportar")}
          </button>
        }
      />
      <ApiStatus loading={loading && !data} error={error} onRetry={refetch} />
      {data ? (
        <>
          <div className="kpis">
            {data.kpis.map((k) => (
              <div className="kpi rv" key={k.nombre}>
                <small>{t(k.nombre)}</small>
                <b>{k.valor}</b>
                <span className="trend">
                  <Icon name="trending-up" /> {k.tendencia} {t("vs. mes anterior")}
                </span>
              </div>
            ))}
          </div>
          <div className="two" style={{ marginTop: 0 }}>
            <div className="panel">
              <h3>{t("Asistentes a webinars por mes")}</h3>
              <p className="sub">{t("Pasa el cursor sobre una barra")}</p>
              <Bars data={data.asistentesPorMes} />
              <div style={{ height: 26 }} />
            </div>
            <VerifPanel />
          </div>
        </>
      ) : null}
    </>
  );
}

function VerifRow({ m }: { m: CedulaVerification }) {
  const t = useT();
  const { busy, run } = useAction();
  const approve = () =>
    run(
      () => apiPost<CedulaVerification>(`/admin/medicos/verificaciones/${m.id}/aprobar`),
      /* toast() traduce: la parte fija va en español después de " · ". */
      `${m.nombre} · verificado. Se le avisó por correo y sumó sus puntos del Club MVZ.`,
    );
  return (
    <div className="list-row">
      <span className="avatar" style={{ width: 36, height: 36, fontSize: 13 }} aria-hidden="true">
        {initialsOf(m.nombre)}
      </span>
      <div>
        <b>{m.nombre}</b>
        <small>
          {t("Cédula")} {m.cedula}
        </small>
      </div>
      <span className="end">
        {m.verificado ? (
          <StateTag cls="st-ok">{t("Verificado")}</StateTag>
        ) : (
          <>
            <button type="button" className="mini" onClick={() => toast("En el sitio real abre la consulta de la SEP con la cédula")}>
              <Icon name="eye" /> {t("Consultar")}
            </button>{" "}
            <button type="button" className="btn btn-primary btn-sm" onClick={approve} disabled={busy} aria-label={`${t("Aprobar")} · ${m.nombre}`}>
              {t("Aprobar")}
            </button>
          </>
        )}
      </span>
    </div>
  );
}

export function VerifPanel() {
  const t = useT();
  const { data, loading, error, refetch } = useAdminApi<CedulaList>("/admin/medicos/verificaciones");
  const pend = data?.filter((v) => !v.verificado).length ?? 0;
  return (
    <div className="panel" id="verif">
      <h3>{t("Verificación de cédulas")}</h3>
      <p className="sub">
        {pend} {t("pendientes · se valida en la consulta pública de la SEP")}
      </p>
      <ApiStatus loading={loading && !data} error={error} onRetry={refetch} />
      {data?.map((m) => <VerifRow key={m.id} m={m} />)}
    </div>
  );
}

export function MedicosPage() {
  return (
    <>
      <MainHead title="Médicos" sub="Verificación de cédulas · datos de ejemplo" />
      <VerifPanel />
    </>
  );
}
