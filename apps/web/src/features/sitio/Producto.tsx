/* /producto/:slug: ficha de producto (producto() del demo). La ficha completa (hechos y descripción) solo se muestra
   si el producto tiene registro (`reg`). Acciones: ficha técnica (pide sesión), PDF por idioma, video de ejemplo. */
import { useState, type KeyboardEvent } from "react";
import { Link, useParams } from "react-router";
import type { Product } from "@kiron/shared";
import { Icon } from "../../components/Icon";
import { ProductCard, ProductImage } from "../../components/ProductCard";
import { ApiStatus } from "../../components/ui";
import { useI18n, useT } from "../../i18n";
import { openModal } from "../../state/modal";
import { useSession } from "../../state/session";
import { toast } from "../../state/toasts";
import { openLogin, requireSession } from "../auth";
import { useCategorias, useProducto } from "./data";
import { NotFound } from "./NotFound";

type PdfLang = "es" | "en";

/* APP.fichaPdf: descarga de ejemplo del PDF aprobado. */
export function fichaPdf(lang: PdfLang): void {
  toast(
    lang === "en"
      ? "Descarga de ejemplo. En la plataforma se baja el PDF aprobado en inglés."
      : "Descarga de ejemplo. En la plataforma se baja el PDF aprobado en español.",
  );
}

function KStage({ label }: { label: string }) {
  const t = useT();
  return (
    <div className="kstage">
      <span className="kplate">
        <img src="/img/kiron-logo.png" alt="Kirón" />
      </span>
      <span className="vlabel">{t(label)}</span>
    </div>
  );
}

function FichaModal() {
  const t = useT();
  const { lang } = useI18n();
  return (
    <div className="modal-b">
      <div className="kstage-wrap">
        <KStage label="PDF de ejemplo" />
      </div>
      <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 14 }}>
        {t("La ficha técnica se publica como PDF, con el diseño de Kirón y aprobada por el área técnica. Elige el idioma.")}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        <button className={`btn ${lang === "en" ? "btn-ghost" : "btn-primary"}`} type="button" onClick={() => fichaPdf("es")}>
          <Icon name="download" /> {t("PDF en español")}
        </button>
        <button className={`btn ${lang === "en" ? "btn-primary" : "btn-ghost"}`} type="button" onClick={() => fichaPdf("en")}>
          <Icon name="download" /> {t("PDF en inglés")}
        </button>
      </div>
    </div>
  );
}

/* APP.fichaTecnica: pide sesión de médico y abre el modal con los PDF. */
export function fichaTecnica(p: Pick<Product, "name">): void {
  requireSession("mvz", () => openModal({ title: `Ficha técnica · ${p.name}`, size: "sm", content: <FichaModal /> }));
}

const TABS = ["Descripción", "Ficha técnica", "Videos"] as const;

export function Producto() {
  const { slug = "" } = useParams();
  const res = useProducto(slug);
  useCategorias();
  if (res.status === 404) return <NotFound />;
  if (!res.data)
    return (
      <div className="wrap" style={{ padding: "40px 32px" }}>
        <ApiStatus loading={res.loading} error={res.error} onRetry={res.refetch} />
      </div>
    );
  return <ProductoView key={slug} product={res.data.product} related={res.data.related} />;
}

function ProductoView({ product: p, related }: { product: Product; related: Product[] }) {
  const t = useT();
  const { lang } = useI18n();
  const { role } = useSession();
  const [tab, setTab] = useState(0);
  const [playing, setPlaying] = useState(false);
  const full = !!p.reg;
  const catHref = `/productos?cat=${encodeURIComponent(p.cat)}`;

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (tab + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    setTab(next);
    document.getElementById(`ptab-${next}`)?.focus();
  };

  return (
    <>
      <div className="wrap">
        <nav className="crumbs" aria-label={t("Ruta")}>
          <Link to="/">{t("Inicio")}</Link>
          <Icon name="chevron-right" />
          <Link to="/productos">{t("Productos")}</Link>
          <Icon name="chevron-right" />
          <Link to={catHref}>{t(p.cat)}</Link>
        </nav>
        <div className="pdp">
          <div className="pdp-gallery rv">
            <ProductImage product={p} large />
          </div>
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {p.isNew ? <span className="badge badge-new">{t("Nuevo")}</span> : null}
              <Link className="badge badge-soft" to={catHref}>
                {t(p.cat)}
              </Link>
            </div>
            <h1 className="rv">{p.name}</h1>
            {p.active ? (
              <p className="active rv">
                {p.active}
                {p.form ? " · " + p.form : ""}
              </p>
            ) : null}
            {full ? (
              <div className="facts rv">
                <div>
                  <small>{t("Principio activo")}</small>
                  <b>{p.active}</b>
                </div>
                <div>
                  <small>{t("Especie")}</small>
                  <b>{(p.species ?? []).join(" y ")}</b>
                </div>
                <div>
                  <small>{t("Presentación")}</small>
                  <b>{p.pres}</b>
                </div>
                <div>
                  <small>{t("Registro")}</small>
                  <b>{p.reg}</b>
                </div>
              </div>
            ) : (
              <div className="notice rv" style={{ margin: "24px 0" }}>
                <Icon name="info" />
                <span>{t("La información técnica de este producto está en su ficha técnica, disponible en PDF en español y en inglés para médicos registrados.")}</span>
              </div>
            )}
            <div className="pdp-actions">
              <button className="btn btn-primary" type="button" onClick={() => fichaTecnica(p)}>
                <Icon name="file-text" /> {t("Ficha técnica")}
              </button>
              <Link className="btn btn-ghost" to="/representantes">
                <Icon name="users" /> {t("Contactar a un representante")}
              </Link>
            </div>
            <div className="notice">
              <Icon name="shield-check" />
              <span>
                {t("Contenido para profesionales de la salud animal. ¿Observaste un evento adverso?")}{" "}
                <Link to={`/farmacovigilancia?p=${encodeURIComponent(p.slug)}`}>{t("Reporte de farmacovigilancia")}</Link>.
              </span>
            </div>
            <div className="tabs" role="tablist" aria-label={t("Ficha técnica")} onKeyDown={onTabKey}>
              {TABS.map((label, i) => (
                <button
                  key={label}
                  id={`ptab-${i}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === i}
                  aria-controls={`ppane-${i}`}
                  tabIndex={tab === i ? 0 : -1}
                  className={tab === i ? "on" : undefined}
                  onClick={() => setTab(i)}
                >
                  {t(label)}
                </button>
              ))}
            </div>
            <div className="tabpane" id="ppane-0" role="tabpanel" aria-labelledby="ptab-0" hidden={tab !== 0}>
              {full ? p.desc : t("Descripción comercial del producto, editable desde el administrador por el equipo de Marketing.")}
            </div>
            <div className="tabpane" id="ppane-1" role="tabpanel" aria-labelledby="ptab-1" hidden={tab !== 1}>
              {role ? (
                <div className="ft-list">
                  {(lang === "en" ? (["en", "es"] as const) : (["es", "en"] as const)).map((l, k) => (
                    <div className="locked" key={l}>
                      <Icon name="file-text" />
                      <div>
                        <b style={{ color: "var(--web-navy)" }}>{t(l === "es" ? "Ficha técnica en español" : "Ficha técnica en inglés")}</b>
                        <p style={{ fontSize: 14, color: "var(--muted)" }}>{t("PDF · versión vigente aprobada por el área técnica")}</p>
                      </div>
                      <button className={`btn ${k ? "btn-ghost" : "btn-primary"} btn-sm`} type="button" style={{ marginLeft: "auto" }} onClick={() => fichaPdf(l)}>
                        <Icon name="download" /> {t("Descargar PDF")}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="locked">
                  <Icon name="lock" />
                  <div>
                    <b style={{ color: "var(--web-navy)" }}>{t("Exclusivo para médicos registrados")}</b>
                    <p style={{ fontSize: 14, color: "var(--muted)" }}>{t("Inicia sesión para descargar la ficha técnica en PDF, en español o en inglés.")}</p>
                  </div>
                  <button className="btn btn-primary btn-sm" type="button" style={{ marginLeft: "auto" }} onClick={() => openLogin({ role: "mvz", stay: true })}>
                    {t("Entrar")}
                  </button>
                </div>
              )}
            </div>
            <div className="tabpane" id="ppane-2" role="tabpanel" aria-labelledby="ptab-2" hidden={tab !== 2}>
              <div className="player" id="pvid">
                {playing ? (
                  <KStage label="Video de ejemplo" />
                ) : (
                  <>
                    <span className="ptitle">{t("Video del producto · ejemplo")}</span>
                    <button className="playbtn" type="button" aria-label={t("Reproducir video")} onClick={() => setPlaying(true)}>
                      <Icon name="play" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <section className="sec" style={{ paddingTop: 80 }}>
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">{t("Relacionados")}</span>
              <h2 className="h-md" style={{ marginTop: 12 }}>
                {t("También te puede interesar")}
              </h2>
            </div>
            <Link className="btn btn-ghost" to={catHref}>
              {t(`Ver ${p.cat.toLowerCase()}`)} <Icon name="arrow-right" />
            </Link>
          </div>
          <div className="grid-p">
            {related.slice(0, 4).map((r) => (
              <ProductCard key={r.slug} product={r} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
