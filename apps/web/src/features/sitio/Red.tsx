/* Red comercial: /representantes y /distribuidores/(mexico|mundo) con el formulario "Quiero ser distribuidor". */
import { useState } from "react";
import { Link, useParams } from "react-router";
import type { RepPerson } from "@kiron/shared";
import { Icon } from "../../components/Icon";
import { ApiStatus, ExtLink, Notice, PageHead } from "../../components/ui";
import { useT } from "../../i18n";
import { scrollToId } from "../../lib/motion";
import { toast } from "../../state/toasts";
import { LINKS } from "../../app/links";
import { usePaises, useRepresentantes } from "./data";

const tel10 = (p: string) => "tel:+52" + p.replace(/\D/g, "");
const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("");

function RepRow({ p }: { p: RepPerson }) {
  const t = useT();
  const [name, role, user, phone] = p;
  return (
    <div className="rep">
      <span className="avatar" aria-hidden="true">
        {initials(name)}
      </span>
      <div className="rep-b">
        <b>{name}</b>
        {role ? <small>{t(role)}</small> : null}
        <span className="rep-c">
          <a href={`mailto:${user}@kironmexico.com`}>
            <Icon name="mail" /> {user}@kironmexico.com
          </a>
          <a href={tel10(phone)}>
            <Icon name="phone" /> {phone}
          </a>
        </span>
        <ExtLink className="mini rep-wa" href={`https://wa.me/52${phone.replace(/\D/g, "")}`} label={`WhatsApp · ${name}`}>
          <Icon name="whatsapp" /> WhatsApp
        </ExtLink>
      </div>
    </div>
  );
}

export function Representantes() {
  const t = useT();
  const res = useRepresentantes();
  return (
    <>
      <PageHead eyebrow="Representantes" title="El equipo de Kirón en tu zona" lead="Encuentra a quién contactar en tu estado." />
      <section className="sec" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <ApiStatus loading={res.loading && !res.data} error={res.error} onRetry={res.refetch} />
          {res.data ? (
            <>
              <div className="rep-zones">
                {res.data.zonas.map((z) => (
                  <div className="panel rv repz" key={z.zone}>
                    <h3>{t(`Zona ${z.zone}`)}</h3>
                    <p className="sub">{t(z.states)}</p>
                    <div className="rep-list">
                      {z.people.map((p) => (
                        <RepRow key={p[2]} p={p} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="panel rv repz" style={{ marginTop: 22 }}>
                <span className="eyebrow">{t("Contacto nacional")}</span>
                <div className="rep-list three">
                  {res.data.nacionales.map((p) => (
                    <RepRow key={p[2]} p={p} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
                  <ExtLink href={LINKS.wa} className="btn btn-primary btn-sm">
                    <Icon name="whatsapp" /> WhatsApp
                  </ExtLink>
                  <a className="btn btn-ghost btn-sm" href={LINKS.tel}>
                    <Icon name="phone" /> {t("Línea Kirón · 55 5112 7743")}
                  </a>
                </div>
              </div>
            </>
          ) : null}
          <Notice style={{ marginTop: 22 }}>
            {t("Zonas, nombres y datos de contacto tomados de kironmexico.com el 18/11/2026. En la nueva plataforma el equipo de Kirón los actualiza desde el administrador.")}
          </Notice>
        </div>
      </section>
    </>
  );
}

export const ESTADOS = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila",
  "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit",
  "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas",
  "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
] as const;

type Kind = "mx" | "mundo";
/* Solicitudes enviadas en la sesión (S.distSent del demo). */
const sent: Record<Kind, boolean> = { mx: false, mundo: false };

export function Distribuidores() {
  const { region } = useParams();
  const kind: Kind = region === "mundo" ? "mundo" : "mx";
  return <DistribuidoresView key={kind} kind={kind} />;
}

function DistribuidoresView({ kind }: { kind: Kind }) {
  const t = useT();
  const mx = kind === "mx";
  const paises = usePaises();
  const [done, setDone] = useState(sent[kind]);
  const activos = paises.data?.activos ?? [];
  const soon = paises.data?.proximamente ?? [];

  /* [FALTA DATO] Endpoint para recibir la solicitud (no está en el contrato). Por ahora, como el demo, solo confirma. */
  const submit = () => {
    sent[kind] = true;
    setDone(true);
    scrollToId("view");
    toast("Solicitud enviada al equipo comercial");
  };

  const lab = (id: string, text: string) => (
    <label className="l" htmlFor={id}>
      {t(text)}
    </label>
  );

  return (
    <>
      {mx ? (
        <PageHead eyebrow="Distribuidores" title="Distribuidores en México" lead="Forma parte de nuestra gran red de distribuidores." />
      ) : (
        <PageHead eyebrow="Distribuidores" title="Distribuidores en el mundo" lead={paises.data ? `Kirón tiene presencia en ${activos.length} países.` : undefined} />
      )}
      {mx ? null : (
        <section className="sec" style={{ paddingTop: 36, paddingBottom: 0 }}>
          <div className="wrap">
            <div className="panel">
              <h3>{t("Dónde estamos")}</h3>
              <p className="sub">{t("Países con distribución de Kirón")}</p>
              <ApiStatus loading={paises.loading && !paises.data} error={paises.error} onRetry={paises.refetch} />
              <div className="countries light-c">
                {activos.map((c) => (
                  <span className="country" key={c}>
                    {t(c)}
                  </span>
                ))}
              </div>
              {soon.length ? (
                <p style={{ marginTop: 16, fontSize: 14, color: "var(--web-navy)" }}>
                  <b>{t("Próximamente:")}</b> {soon.map((c) => t(c)).join(` ${t("y")} `)}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      )}
      <section className="sec" style={{ paddingTop: 36 }}>
        <div className="wrap">
          <div className="two dist-grid" style={{ margin: 0 }}>
            {done ? (
              <div className="panel success" role="status">
                <div className="big-ok">
                  <Icon name="circle-check" />
                </div>
                <h3 style={{ fontSize: 24, margin: "10px 0 6px" }}>{t("Gracias por tu interés")}</h3>
                <p style={{ color: "var(--muted)" }}>{t("Recibimos tu información. El equipo comercial la revisa y te contacta.")}</p>
                <Link className="btn btn-ghost" style={{ marginTop: 18 }} to="/">
                  {t("Volver al inicio")}
                </Link>
              </div>
            ) : (
              <form
                className="panel"
                style={{ padding: 32 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <h3>{t("Permítenos conocerte")}</h3>
                <p className="sub">{t("Todos los campos son obligatorios, salvo los indicados.")}</p>
                <div className="grid2">
                  <div className="form-row">
                    {lab("d1", "Tu nombre")}
                    <input className="input" id="d1" autoComplete="name" required />
                  </div>
                  <div className="form-row">
                    {lab("d2", "Tu email")}
                    <input className="input" id="d2" type="email" autoComplete="email" required />
                  </div>
                </div>
                <div className="grid2">
                  <div className="form-row">
                    {lab("d3", "Tu teléfono")}
                    <input className="input" id="d3" type="tel" autoComplete="tel" required />
                  </div>
                  <div className="form-row">
                    {lab("d4", mx ? "Estado" : "País")}
                    {mx ? (
                      <select className="select" id="d4" required defaultValue="">
                        <option value="">{t("Elige tu estado")}</option>
                        {ESTADOS.map((e) => (
                          <option key={e}>{e}</option>
                        ))}
                      </select>
                    ) : (
                      <input className="input" id="d4" autoComplete="country-name" required placeholder={t("Ej. Colombia")} />
                    )}
                  </div>
                </div>
                <div className="form-row">
                  {lab("d5", "¿Qué marcas y en qué laboratorios distribuyes actualmente?")}
                  <textarea className="input" id="d5" rows={3} required style={{ height: "auto", padding: "12px 16px" }} />
                </div>
                <div className="grid2">
                  <div className="form-row">
                    {lab("d6", "Número de rutas actuales")}
                    <input className="input" id="d6" type="number" min={0} required />
                  </div>
                  <div className="form-row">
                    {lab("d7", "Número de vendedores que tienes")}
                    <input className="input" id="d7" type="number" min={0} required />
                  </div>
                </div>
                <div className="form-row">
                  {lab("d8", "Adjunta una presentación de la empresa (opcional)")}
                  <input className="input" id="d8" type="file" style={{ paddingTop: 14 }} />
                </div>
                <div className="form-row">
                  {lab("d9", "Comentarios adicionales (opcional)")}
                  <textarea className="input" id="d9" rows={3} style={{ height: "auto", padding: "12px 16px" }} />
                </div>
                <label className="opt" style={{ marginBottom: 18 }}>
                  <input type="checkbox" required /> {t("Acepto el")} <Link to="/legal/privacidad">{t("aviso de privacidad")}</Link>
                </label>
                <button className="btn btn-accent btn-block" type="submit">
                  <Icon name="send" /> {t("Enviar")}
                </button>
              </form>
            )}
            <div className="panel dist-side">
              <span className="eyebrow">{t(mx ? "Quiero ser distribuidor" : "Distribuye Kirón en tu país")}</span>
              <h3 style={{ marginTop: 12 }}>{t("Escríbenos o llámanos")}</h3>
              <p className="sub">{t("El equipo comercial revisa cada solicitud y te contacta.")}</p>
              <a className="list-row as-btn" href={LINKS.tel}>
                <span className="lr-ico">
                  <Icon name="phone" />
                </span>
                <div>
                  <b>{LINKS.telLabel}</b>
                  <small>{t("Teléfono")}</small>
                </div>
              </a>
              <a className="list-row as-btn" href={`mailto:${LINKS.mailDist}`}>
                <span className="lr-ico">
                  <Icon name="mail" />
                </span>
                <div>
                  <b>{LINKS.mailDist}</b>
                  <small>{t("Correo")}</small>
                </div>
              </a>
              <div style={{ marginTop: 16 }}>
                <ExtLink href={LINKS.wa} className="btn btn-primary btn-block">
                  <Icon name="whatsapp" /> {t("Mensaje de WhatsApp")}
                </ExtLink>
              </div>
              <div className="seg" style={{ marginTop: 14, flexWrap: "wrap" }}>
                <Link className="mini" to={`/distribuidores/${mx ? "mundo" : "mexico"}`}>
                  <Icon name="globe" /> {t(mx ? "Distribuidores en el mundo" : "Distribuidores en México")}
                </Link>
                <Link className="mini" to="/representantes">
                  <Icon name="users" /> {t("Representantes")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
