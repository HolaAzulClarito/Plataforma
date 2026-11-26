/* Webinars (adminWebinars, APP.webinarNew/webinarSave, APP.webinarStream, APP.attendees). */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { slugify, todayIso, youtubeId, type AdminWebinar, type AdminWebinarList, type WebinarCreateRequest, type WebinarHistoryRow, type WebinarMode } from "@kiron/shared";
import { Icon } from "../../components/Icon";
import { ApiStatus, Notice } from "../../components/ui";
import { useT } from "../../i18n";
import { apiGet, apiPost } from "../../lib/api";
import { downloadText } from "../../lib/download";
import { closeModal, openModal } from "../../state/modal";
import { toast } from "../../state/toasts";
import { bumpAdmin, copyText, EmptyRow, failToast, readImage, StateTag, useAdminApi } from "./common";
import { MainHead } from "./Shell";

const HINT = { fontSize: 12.5, color: "var(--muted)", margin: "-12px 0 16px" } as const;

function CopyRow({ id, label, value }: { id: string; label: string; value: string }) {
  const t = useT();
  return (
    <div className="form-row">
      <label className="l" htmlFor={id}>
        {t(label)}
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="input" id={id} value={value} readOnly onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => copyText(value)} aria-label={`${t("Copiar")} · ${t(label)}`}>
          <Icon name="copy" /> {t("Copiar")}
        </button>
      </div>
    </div>
  );
}

/* Datos para el ponente y landing (APP.webinarStream). Solo los ve el equipo. */
function StreamInfo({ w }: { w: AdminWebinar }) {
  const t = useT();
  return (
    <div className="modal-b">
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 18 }}>
        {w.flyer ? <img src={w.flyer} alt={t("Flyer del webinar")} style={{ width: 110, borderRadius: 10, flex: "none" }} /> : null}
        <div>
          <h3 style={{ fontSize: 20, margin: "0 0 4px" }}>{w.titulo}</h3>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            <span>
              {w.fecha} · {w.hora} {t("Hrs (México)")} · {w.duracion} min
            </span>{" "}
            · <span>{`${w.grado} ${w.ponente}`}</span>
          </p>
        </div>
      </div>
      <h4 className="wf-h">{t("Landing del webinar")}</h4>
      <CopyRow id="wRl" label="Dirección pública" value={w.landing} />
      <Link className="btn btn-ghost btn-sm" style={{ margin: "-6px 0 18px" }} to={`/webinar/${w.slug}`} onClick={() => closeModal()}>
        <Icon name="eye" /> {t("Abrir la landing")}
      </Link>
      {w.modo === "youtube" ? (
        <>
          <Notice style={{ marginBottom: 16 }}>{t("Respaldo con YouTube: el ponente transmite a YouTube en vivo como no listado y la landing incrusta ese enlace.")}</Notice>
          <CopyRow id="wRy" label="Enlace de YouTube" value={w.youtube} />
        </>
      ) : (
        <>
          <h4 className="wf-h">{t("Datos para el ponente (Zoom)")}</h4>
          <CopyRow id="wRu" label="Dirección del servidor (URL de transmisión)" value={w.servidor} />
          <CopyRow id="wRk" label="Clave de transmisión" value={w.clave} />
          <ol style={{ fontSize: 14, lineHeight: 1.6, paddingLeft: 20, margin: "6px 0 16px" }}>
            <li>{t("El ponente abre su reunión en Zoom con cuenta de pago.")}</li>
            <li>{t("Más, Transmitir en vivo, Servicio de transmisión en vivo personalizado.")}</li>
            <li>{t("Pega la dirección del servidor y la clave, y en página de transmisión pone la dirección de la landing.")}</li>
            <li>{t("Inicia la transmisión 15 minutos antes para probar audio y video.")}</li>
          </ol>
        </>
      )}
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>
        {t("Datos de ejemplo. En la plataforma, la clave la genera Cloudflare Stream, solo la ve el equipo con doble factor y no se envía por correo.")}
      </p>
    </div>
  );
}

export const openStream = (w: AdminWebinar, recien = false) =>
  openModal({ title: recien ? "Webinar creado" : "Transmisión y landing", content: <StreamInfo w={w} /> });

/* Formulario por pasos del demo: 1. datos, 2. ponente y horario, 3. flyer y landing, 4. transmisión. */
function WebinarForm({ taken }: { taken: string[] }) {
  const t = useT();
  const [f, setF] = useState({ titulo: "", tituloEn: "", subtitulo: "", subtituloEn: "", grado: "MVZ", ponente: "", fecha: "", hora: "20:00", duracion: "90", umbral: "45", youtube: "" });
  const [slug, setSlug] = useState("");
  const [manual, setManual] = useState(false);
  const [modo, setModo] = useState<WebinarMode>("cloudflare");
  const [publicado, setPublicado] = useState(true);
  const [flyer, setFlyer] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => {
    const v = e.target.value;
    setF((p) => ({ ...p, [k]: v }));
    if (k === "titulo" && !manual) setSlug(slugify(v));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const w = { ...f, titulo: f.titulo.trim(), tituloEn: f.tituloEn.trim(), ponente: f.ponente.trim(), youtube: f.youtube.trim() };
    const duracion = Number(w.duracion);
    const umbral = Number(w.umbral);
    const s = slugify(slug);
    let msg = "";
    if (!w.titulo || !w.tituloEn) msg = "Escribe el título en español y en inglés.";
    else if (!w.ponente) msg = "Escribe el nombre del ponente.";
    else if (!w.fecha || !/^\d{2}:\d{2}$/.test(w.hora)) msg = "Elige la fecha y la hora.";
    else if (new Date(`${w.fecha}T${w.hora}:00-06:00`).getTime() <= Date.now()) msg = "La fecha y la hora tienen que ser futuras.";
    else if (!(umbral >= 1 && umbral <= duracion)) msg = "Los minutos para contar asistencia van de 1 a la duración del webinar.";
    else if (!s) msg = "Escribe la dirección de la landing.";
    else if (s === "proximo" || taken.includes(s)) msg = "Ya existe un webinar con esa dirección; cámbiala.";
    else if (modo === "youtube" && !youtubeId(w.youtube)) msg = "Pega un enlace válido de YouTube (youtube.com/live/…, youtu.be/… o watch?v=…).";
    if (msg) {
      setErr(msg);
      return;
    }
    const body: WebinarCreateRequest = {
      titulo: w.titulo,
      tituloEn: w.tituloEn,
      subtitulo: w.subtitulo.trim(),
      subtituloEn: w.subtituloEn.trim(),
      grado: w.grado,
      ponente: w.ponente,
      fecha: w.fecha,
      hora: w.hora,
      duracion: duracion as WebinarCreateRequest["duracion"],
      umbral,
      slug: s,
      modo,
      youtube: modo === "youtube" ? w.youtube : "",
      publicado,
      flyer,
    };
    setBusy(true);
    try {
      const created = await apiPost<AdminWebinar>("/admin/webinars", body);
      bumpAdmin();
      openStream(created, true);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "No se pudo crear el webinar.");
      failToast(ex, "No se pudo crear el webinar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="modal-b" id="fWeb" noValidate onSubmit={submit}>
      <h4 className="wf-h">{t("1. Datos del webinar")}</h4>
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="wTi">{t("Título en español")}</label>
          <input className="input" id="wTi" maxLength={120} required value={f.titulo} onChange={set("titulo")} />
        </div>
        <div className="form-row">
          <label className="l" htmlFor="wTe">{t("Título en inglés")}</label>
          <input className="input" id="wTe" maxLength={120} required value={f.tituloEn} onChange={set("tituloEn")} />
        </div>
      </div>
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="wSu">{t("Subtítulo en español (opcional)")}</label>
          <input className="input" id="wSu" maxLength={160} value={f.subtitulo} onChange={set("subtitulo")} />
        </div>
        <div className="form-row">
          <label className="l" htmlFor="wSe">{t("Subtítulo en inglés (opcional)")}</label>
          <input className="input" id="wSe" maxLength={160} value={f.subtituloEn} onChange={set("subtituloEn")} />
        </div>
      </div>
      <p style={HINT}>{t("El sitio se publica en español e inglés: los dos títulos son obligatorios.")}</p>
      <h4 className="wf-h">{t("2. Ponente y horario")}</h4>
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="wGr">{t("Grado del ponente")}</label>
          <select className="input" id="wGr" value={f.grado} onChange={set("grado")}>
            {["MVZ", "Dr.", "Dra.", "M. en C.", "Esp."].map((x) => (
              <option key={x} value={x}>
                {t(x)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label className="l" htmlFor="wPo">{t("Nombre del ponente")}</label>
          <input className="input" id="wPo" maxLength={120} required autoComplete="off" value={f.ponente} onChange={set("ponente")} />
        </div>
      </div>
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="wFe">{t("Fecha")}</label>
          <input className="input" type="date" id="wFe" min={todayIso()} required value={f.fecha} onChange={set("fecha")} />
        </div>
        <div className="form-row">
          <label className="l" htmlFor="wHo">{t("Hora (centro de México)")}</label>
          <input className="input" type="time" id="wHo" step={900} required value={f.hora} onChange={set("hora")} />
        </div>
      </div>
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="wDu">{t("Duración")}</label>
          <select className="input" id="wDu" value={f.duracion} onChange={set("duracion")}>
            {["60", "90", "120"].map((x) => (
              <option key={x} value={x}>
                {t(`${x} minutos`)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label className="l" htmlFor="wUm">{t("Minutos para contar asistencia")}</label>
          <input className="input" type="number" id="wUm" min={1} max={120} required value={f.umbral} onChange={set("umbral")} />
        </div>
      </div>
      <p style={HINT}>{t("Quien vea al menos estos minutos en vivo recibe asistencia, constancia y puntos del Club MVZ.")}</p>
      <h4 className="wf-h">{t("3. Flyer y landing")}</h4>
      <div className="wf-flyer">
        <div className="form-row" style={{ margin: 0 }}>
          <label className="l" htmlFor="wFl">{t("Flyer o portada (JPG, PNG o WebP, máximo 2 MB)")}</label>
          <input
            className="input file"
            type="file"
            id="wFl"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              const input = e.currentTarget;
              const url = await readImage(input.files?.[0], /^image\/(jpeg|png|webp)$/, 2 * 1024 * 1024, { type: "El flyer debe ser JPG, PNG o WebP", size: "El flyer pesa más de 2 MB" });
              if (!url) input.value = "";
              setFlyer(url);
            }}
          />
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0 0" }}>
            {t("Se muestra en la landing, en Academia y en los correos de recordatorio. Recomendado: 1080 × 1350 px.")}
          </p>
        </div>
        <div className={flyer ? "wf-prev has" : "wf-prev"} aria-hidden="true">
          <Icon name="video" />
          {flyer ? <img src={flyer} alt="" /> : null}
        </div>
      </div>
      <div className="form-row" style={{ marginTop: 18 }}>
        <label className="l" htmlFor="wSl">{t("Dirección de la landing")}</label>
        <div className="wf-url">
          <span>kironmexico.com/es/webinar/</span>
          <input
            className="input"
            id="wSl"
            maxLength={60}
            required
            value={slug}
            onChange={(e) => {
              setManual(true);
              setSlug(e.target.value);
            }}
          />
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0 0" }}>
          {t("Página propia del webinar: registro antes del evento y la transmisión dentro del sitio el día del evento. Se arma sola con el título; puedes ajustarla.")}
        </p>
      </div>
      <h4 className="wf-h">{t("4. Transmisión")}</h4>
      <fieldset className="wf-modo">
        <legend className="sr">{t("Cómo llega la transmisión a la landing")}</legend>
        <label className="wf-op">
          <input type="radio" name="wMo" value="cloudflare" checked={modo === "cloudflare"} onChange={() => setModo("cloudflare")} />
          <span>
            <b>{t("Zoom → reproductor del sitio (recomendado)")}</b>
            <small>
              {t(
                "No pegas ningún enlace. Al guardar se crea la sala de transmisión y te damos la dirección y la clave que el ponente pone en Zoom (Transmitir en vivo, servicio personalizado). La landing toma la señal sola y mide la asistencia.",
              )}
            </small>
          </span>
        </label>
        <label className="wf-op">
          <input type="radio" name="wMo" value="youtube" checked={modo === "youtube"} onChange={() => setModo("youtube")} />
          <span>
            <b>{t("YouTube en vivo no listado (respaldo)")}</b>
            <small>{t("Solo si la prueba con Zoom falla. El ponente transmite a YouTube y aquí pegas el enlace; la landing lo incrusta. El enlace podría compartirse fuera del sitio.")}</small>
          </span>
        </label>
      </fieldset>
      {modo === "youtube" ? (
        <div className="form-row">
          <label className="l" htmlFor="wYt">{t("Enlace de la transmisión en YouTube")}</label>
          <input className="input" id="wYt" type="url" placeholder="https://www.youtube.com/live/..." value={f.youtube} onChange={set("youtube")} />
        </div>
      ) : null}
      <label style={{ display: "flex", gap: 10, alignItems: "center", margin: "6px 0 18px", fontSize: 14 }}>
        <input type="checkbox" id="wPu" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} /> {t("Publicar en el sitio y abrir el registro")}
      </label>
      {err ? (
        <p className="err" role="alert" style={{ color: "#b42318", fontSize: 13.5, marginBottom: 12 }}>
          {t(err)}
        </p>
      ) : null}
      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
        <Icon name="plus" /> {t("Crear webinar")}
      </button>
    </form>
  );
}

function Attendees({ row }: { row: WebinarHistoryRow }) {
  const t = useT();
  const [list, setList] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    apiGet<string[]>(`/admin/webinars/${row.slug}/asistentes`).then(setList, (e: Error) => setError(e.message));
  }, [row.slug]);
  useEffect(load, [load]);
  const exportList = () => {
    if (!list) return;
    downloadText(`asistentes-${row.slug}.csv`, "\uFEFF" + ["Nombre", ...list.map((n) => `"${n.replace(/"/g, '""')}"`)].join("\n") + "\n", "text/csv;charset=utf-8");
    toast("Lista descargada");
  };
  return (
    <div className="modal-b">
      <ApiStatus loading={list === null && !error} error={error} onRetry={load} />
      {list?.length === 0 ? <p className="sub">{t("Todavía no hay asistentes registrados.")}</p> : null}
      {list?.map((n) => (
        <div className="list-row" key={n}>
          <span className="lr-ico">
            <Icon name="user" />
          </span>
          <div>
            <b>{n}</b>
            <small>{t("Entró desde el sitio · nombres de ejemplo")}</small>
          </div>
          <span className="end">
            <span className="badge badge-ok">+50</span>
          </span>
        </div>
      ))}
      {list?.length ? (
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={exportList}>
          <Icon name="download" /> {t("Exportar lista")}
        </button>
      ) : null}
    </div>
  );
}

export function WebinarsPage() {
  const t = useT();
  const { data, loading, error, refetch } = useAdminApi<AdminWebinarList>("/admin/webinars");
  const taken = data?.nuevos.map((w) => w.slug) ?? [];
  return (
    <>
      <MainHead
        title="Webinars"
        sub="Registro y asistencia de cada transmisión · cifras de ejemplo"
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => openModal({ title: "Nuevo webinar", content: <WebinarForm taken={taken} /> })}>
            <Icon name="plus" /> {t("Nuevo webinar")}
          </button>
        }
      />
      <ApiStatus loading={loading && !data} error={error} onRetry={refetch} />
      {data ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">{t("Webinar")}</th>
                <th scope="col">{t("Fecha")}</th>
                <th scope="col">{t("Estado")}</th>
                <th scope="col">{t("Registrados")}</th>
                <th scope="col">{t("Asistentes")}</th>
                <th scope="col">
                  <span className="sr">{t("Acciones")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.nuevos.map((w) => (
                <tr key={w.slug}>
                  <td>
                    <b style={{ color: "var(--web-navy)" }}>{w.titulo}</b>
                    {w.subtitulo ? <small style={{ display: "block", color: "var(--muted)" }}>{w.subtitulo}</small> : null}
                    <small style={{ display: "block", color: "var(--muted)" }}>{`${w.grado} ${w.ponente}`}</small>
                  </td>
                  <td>
                    {w.fecha}
                    <small style={{ display: "block", color: "var(--muted)" }}>
                      {w.hora} {t("Hrs")}
                    </small>
                  </td>
                  <td>
                    <StateTag cls={w.publicado ? "st-rev" : ""}>{t(w.publicado ? "Programado" : "Borrador")}</StateTag>
                  </td>
                  <td>0</td>
                  <td>—</td>
                  <td className="nowrap">
                    <Link className="mini" to={`/webinar/${w.slug}`}>
                      <Icon name="eye" /> {t("Ver landing")}
                    </Link>{" "}
                    <button type="button" className="mini" onClick={() => openStream(w)}>
                      <Icon name="video" /> {t("Datos para el ponente")}
                    </button>
                  </td>
                </tr>
              ))}
              {data.historial.map((w) => (
                <tr key={w.titulo}>
                  <td>
                    <b style={{ color: "var(--web-navy)" }}>{w.titulo}</b>
                  </td>
                  <td>{w.fecha}</td>
                  <td>
                    <StateTag cls={w.estado === "Próximo" ? "st-rev" : "st-ok"}>{t(w.estado)}</StateTag>
                  </td>
                  <td>{w.registrados}</td>
                  <td>{w.asistentes === null ? "—" : w.asistentes}</td>
                  <td className="nowrap">
                    {w.slug === "proximo" ? (
                      <>
                        <Link className="mini" to="/webinar/proximo">
                          <Icon name="eye" /> {t("Ver landing")}
                        </Link>{" "}
                      </>
                    ) : null}
                    {/* [API] Las filas de ejemplo sin slug no tienen cómo pedir sus asistentes (ver entrega). */}
                    {w.slug && w.asistentes !== null ? (
                      <button type="button" className="mini" onClick={() => openModal({ title: `Asistentes · ${w.titulo}`, content: <Attendees row={w} />, size: "sm" })}>
                        <Icon name="users" /> {t("Ver asistentes")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!data.nuevos.length && !data.historial.length ? <EmptyRow cols={6}>{t("Sin webinars.")}</EmptyRow> : null}
            </tbody>
          </table>
        </div>
      ) : null}
      <Notice style={{ marginTop: 16 }}>
        {t(
          "El ponente transmite desde Zoom con transmisión personalizada hacia el reproductor del sitio, y el público entra con su cuenta. Así se sabe quién asistió y se le suman sus puntos automáticamente.",
        )}
      </Notice>
    </>
  );
}
