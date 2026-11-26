/* /verificar y /verificar/:folio (verificar() del demo): verificación pública con GET /api/constancias/:folio. */
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { CertificateKind, CertificateVerification } from "@kiron/shared";
import { Icon, PageHead } from "../../components";
import { useT } from "../../i18n";
import { useApi } from "../../lib/api";
import { SAMPLE_FOLIO } from "../../app/links";

const KIND: Record<CertificateKind, string> = { curso: "Curso", diplomado: "Diplomado", webinar: "Webinar" };

export function VerificarPage() {
  const t = useT();
  const { folio: raw = "" } = useParams();
  const folio = raw.trim().toUpperCase();
  const nav = useNavigate();
  const [value, setValue] = useState(folio);
  useEffect(() => setValue(folio), [folio]);
  const res = useApi<CertificateVerification>(folio ? `/api/constancias/${encodeURIComponent(folio)}` : null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const f = value.trim().toUpperCase();
    if (f) nav(`/verificar/${encodeURIComponent(f)}`);
  };

  const v = res.data && res.data.folio === folio ? res.data : null;
  const bad = !!folio && !res.loading && !v && (res.status === 404 || res.status === 400);

  return (
    <>
      <PageHead eyebrow="Verificación de constancias" title="Verifica una constancia" lead="Escanea el QR o escribe el folio que aparece en la constancia." />
      <section className="sec" style={{ paddingTop: 40 }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          <form className="search-big" role="search" onSubmit={submit}>
            <Icon name="qr-code" />
            <input name="f" value={value} onChange={(e) => setValue(e.target.value)} placeholder="KI-2026-000000" aria-label={t("Folio")} autoComplete="off" />
            <button className="btn btn-primary btn-sm" type="submit" style={{ borderRadius: 50 }}>
              {t("Verificar")}
            </button>
          </form>
          <div aria-live="polite" aria-atomic="true">
            {folio && res.loading && !v ? (
              <p className="api-loading" role="status">
                {t("Verificando…")}
              </p>
            ) : null}
            {v ? (
              <div className="verify ok">
                <Icon name="badge-check" />
                <div>
                  <b>{t("Constancia válida")}</b>
                  <p>
                    {t("Folio")} {v.folio} · {t(KIND[v.tipo])} · {v.titulo} · {t("emitida el")} {v.fecha} {t("a nombre de")} {v.titular}.
                  </p>
                </div>
              </div>
            ) : null}
            {bad ? (
              <div className="verify bad">
                <Icon name="triangle-alert" />
                <div>
                  <b>{t("No encontramos ese folio")}</b>
                  <p>{t("Revisa que tenga el formato KI-2026-000000. Las constancias migradas conservan su folio original.")}</p>
                </div>
              </div>
            ) : null}
            {folio && res.error && !bad ? (
              <div className="notice warn" role="alert">
                <Icon name="triangle-alert" />
                <span>
                  {t("No pudimos verificar el folio en este momento.")}{" "}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={res.refetch}>
                    {t("Reintentar")}
                  </button>
                </span>
              </div>
            ) : null}
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 16 }}>
            {t("Prueba con el folio de ejemplo")} <Link to={`/verificar/${SAMPLE_FOLIO}`}>{SAMPLE_FOLIO}</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
