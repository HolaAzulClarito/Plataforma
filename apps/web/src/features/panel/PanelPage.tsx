/* /panel/* del médico (panelShell(), panel(), misCursos(), misConstancias() y clubView() del demo).
   Todo sale de la API: /api/me/cursos, /api/me/constancias, /api/me/puntos, /api/club/* y /api/me/webinars/proximo. */
import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import {
  DEMO_USER,
  type CertificateSummary,
  type ClubReward,
  type ClubRule,
  type ExamState,
  type MyCoursesResponse,
  type NextWebinar,
  type PointsBalance,
  type RedeemResult,
} from "@kiron/shared";
import { ApiStatus, ICONS, Icon, type IconName } from "../../components";
import { useI18n, useT } from "../../i18n";
import { ApiError, apiPost, useApi } from "../../lib/api";
import { cx } from "../../lib/cx";
import { closeModal, openModal } from "../../state/modal";
import { session } from "../../state/session";
import { toast } from "../../state/toasts";
import { SAMPLE_FOLIO } from "../../app/links";
import { downloadCertificate } from "../academia/print";
import { downloadWebinarIcs, enterLive, useWebinarStatus, webinarReg } from "../webinars/actions";
import { WebinarDate } from "../webinars/NextWebinar";
import { webinarIsPast } from "../webinars/status";
import { refreshMe } from "./useMe";

type Tab = "" | "cursos" | "constancias" | "club";
const TABS: Array<[Tab, IconName, string]> = [
  ["", "layout-dashboard", "Inicio"],
  ["cursos", "graduation-cap", "Mis cursos"],
  ["constancias", "award", "Constancias"],
  ["club", "gift", "Club"],
];

const fmt = (n: number) => n.toLocaleString("es-MX");
const firstName = DEMO_USER.name.replace("Laura ", "");

function Shell({ tab, children }: { tab: Tab; children: ReactNode }) {
  const t = useT();
  return (
    <div className="app">
      <nav className="side" aria-label={t("Mi panel")}>
        <div className="who">
          <span className="avatar">{DEMO_USER.initials}</span>
          <div>
            <b>{DEMO_USER.name}</b>
            <small>
              <Icon name="badge-check" /> {t("Cédula verificada")}
            </small>
          </div>
        </div>
        {TABS.map(([k, ic, label]) => (
          <Link key={k} to={k ? `/panel/${k}` : "/panel"} className={tab === k ? "on" : undefined} aria-current={tab === k ? "page" : undefined}>
            <Icon name={ic} />
            <span>{t(label)}</span>
          </Link>
        ))}
        <div className="bottom hide-m">
          <Link to="/academia">
            <Icon name="book-open" />
            <span>{t("Academia")}</span>
          </Link>
          <button className="side-btn" type="button" onClick={() => session.logout()}>
            <Icon name="log-out" />
            <span>{t("Salir")}</span>
          </button>
        </div>
      </nav>
      <main className="main page-enter" id="main">
        {children}
      </main>
    </div>
  );
}

export function PanelPage() {
  const params = useParams();
  const raw = (params["*"] ?? "").replace(/\/$/, "");
  const tab: Tab = raw === "cursos" || raw === "constancias" || raw === "club" ? raw : "";
  return (
    <Shell tab={tab}>
      {tab === "cursos" ? <MisCursos /> : tab === "constancias" ? <MisConstancias /> : tab === "club" ? <Club /> : <Inicio />}
    </Shell>
  );
}

/* ---------------- Inicio ---------------- */

function LiveCard() {
  const t = useT();
  const w = useApi<NextWebinar>("/api/webinars/proximo");
  const st = useWebinarStatus("proximo").data;
  if (!w.data) return <ApiStatus loading={w.loading} error={w.error} onRetry={w.refetch} />;
  const d = w.data;
  const reg = !!st?.registrado;
  const past = webinarIsPast(d);
  return (
    <div className="panel rv live-card">
      <div className="lc-body">
        <span className="badge badge-dark">
          <Icon name="video" /> {t("Webinar")}
        </span>
        <h2>{d.title}</h2>
        <p>
          {d.deg} {d.speaker} · {d.date.split("-").reverse().join("/")} · {d.time} {t("(México)")}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          {reg ? (
            <>
              <button className="btn btn-accent" type="button" onClick={() => enterLive()}>
                <Icon name="play" /> {t("Entrar")}
              </button>
              {past ? null : (
                <button className="btn btn-outline-light btn-sm" type="button" onClick={() => downloadWebinarIcs(d)}>
                  <Icon name="calendar" /> {t("Agregar a mi calendario")}
                </button>
              )}
            </>
          ) : past ? (
            <Link className="btn btn-accent" to="/webinar/proximo">
              <Icon name="circle-play" /> {t("Ver la página del webinar")}
            </Link>
          ) : (
            <button className="btn btn-accent" type="button" onClick={() => webinarReg(d)}>
              <Icon name="calendar" /> {t("Registrarme")}
            </button>
          )}
        </div>
        <p className="lc-note">
          {t(
            reg
              ? st?.asistio
                ? "Tu asistencia ya quedó registrada · +50 puntos."
                : "En el demo puedes entrar antes de la hora para ver la sala."
              : "Regístrate para que el botón Entrar aparezca aquí el día del webinar.",
          )}
        </p>
      </div>
      <div className="lc-side">
        <WebinarDate w={d} />
      </div>
    </div>
  );
}

function Inicio() {
  const t = useT();
  const cursos = useApi<MyCoursesResponse>("/api/me/cursos");
  const certs = useApi<CertificateSummary[]>("/api/me/constancias");
  const pts = useApi<PointsBalance>("/api/me/puntos");
  const premios = useApi<ClubReward[]>("/api/club/premios");
  const active = (cursos.data?.cursos ?? []).filter((c) => !c.constancia);
  const saldo = pts.data?.saldo;
  const mineSlugs = new Set((cursos.data?.cursos ?? []).map((c) => c.course.slug));
  const next =
    saldo === undefined
      ? undefined
      : (premios.data ?? [])
          .filter((r) => !pts.data?.canjeados.includes(r.id) && !mineSlugs.has(r.id))
          .sort((a, b) => a.puntos - b.puntos)
          .find((r) => r.puntos > saldo);
  const err = cursos.error ?? certs.error ?? pts.error;
  return (
    <>
      <div className="main-head">
        <div>
          <h1>
            {t("Buenas tardes")}, {firstName}
          </h1>
          <p>{t("Tus cursos, el webinar en vivo y tus puntos · datos de ejemplo")}</p>
        </div>
        <Link className="btn btn-ghost" to="/academia">
          <Icon name="book-open" /> {t("Explorar academia")}
        </Link>
      </div>
      <LiveCard />
      {err ? <ApiStatus loading={false} error={err} onRetry={() => (cursos.refetch(), certs.refetch(), pts.refetch())} /> : null}
      <div className="dash" style={{ marginTop: 18 }}>
        <Link className="qa prime rv" to="/panel/cursos">
          <span className="qi">
            <Icon name="graduation-cap" />
          </span>
          <b>{cursos.data ? t(`${active.length} cursos en curso`) : "—"}</b>
          <small>{t("Continúa donde te quedaste")}</small>
        </Link>
        <Link className="qa rv" to="/panel/constancias">
          <span className="qi">
            <Icon name="award" />
          </span>
          <b>{certs.data ? t(`${certs.data.length} constancias`) : "—"}</b>
          <small>{t("Descárgalas o compártelas")}</small>
        </Link>
        <Link className="qa rv" to="/panel/club">
          <span className="qi">
            <Icon name="gift" />
          </span>
          <b>{saldo !== undefined ? t(`${fmt(saldo)} puntos`) : "—"}</b>
          <small>{t("Club MVZ")}</small>
        </Link>
        <Link className="qa rv" to="/panel/club">
          <span className="qi">
            <Icon name="target" />
          </span>
          <b>{saldo === undefined ? "—" : next ? t(`${fmt(next.puntos - saldo)} para canjear`) : t("Ya puedes canjear")}</b>
          <small>{next ? next.nombre : t("Revisa tus canjes")}</small>
        </Link>
      </div>
      <div className="panel rv" style={{ marginTop: 18 }}>
        <h3>{t("Continúa aprendiendo")}</h3>
        <p className="sub">{t("Toca un curso para retomarlo")}</p>
        <ApiStatus loading={cursos.loading && !cursos.data} error={null} />
        {cursos.data && !active.length ? (
          <p style={{ color: "var(--muted)" }}>
            {t("No tienes cursos en curso.")} <Link to="/academia">{t("Explora la academia")}</Link>.
          </p>
        ) : null}
        {active.map((c) => (
          <Link key={c.course.slug} className="list-row" to={`/academia/curso/${c.course.slug}`}>
            <span className="lr-ico">
              <Icon name="book-open" />
            </span>
            <div>
              <b>{c.course.title}</b>
              <small>{t(`${c.pct}% completado`)}</small>
            </div>
            <span className="end">
              <span className="link-arrow">
                {t("Continuar")} <Icon name="arrow-right" />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}

/* ---------------- Mis cursos ---------------- */

const EXAM_STATE: Record<ExamState, [string, string]> = {
  aprobado: ["Aprobado", "st-ok"],
  sin_intentos: ["Sin intentos", "st-rev"],
  disponible: ["Disponible", "st-rev"],
  en_curso: ["En curso", "st-rev"],
  programado: ["Programado", "st-draft"],
  bloqueado: ["Bloqueado", "st-draft"],
};

function MisCursos() {
  const t = useT();
  const r = useApi<MyCoursesResponse>("/api/me/cursos");
  const cursos = r.data?.cursos ?? [];
  const pend = r.data?.solicitudes ?? [];
  const titles = useApi<{ slug: string; title: string }[]>(pend.length ? "/api/cursos" : null).data;
  const titleOf = (s: string) => titles?.find((c) => c.slug === s)?.title ?? s;
  return (
    <>
      <div className="main-head">
        <div>
          <h1>{t("Mis cursos")}</h1>
          <p>{t("Tu avance se guarda en cualquier dispositivo · datos de ejemplo")}</p>
        </div>
        <Link className="btn btn-ghost" to="/academia">
          {t("Explorar academia")}
        </Link>
      </div>
      <ApiStatus loading={r.loading && !r.data} error={r.error} onRetry={r.refetch} />
      {pend.length ? (
        <div className="panel" style={{ marginBottom: 18 }}>
          <h3>{t("Solicitudes de inscripción")}</h3>
          <p className="sub">{t("El equipo de Academia las revisa y te avisa por correo")}</p>
          {pend.map((e) => (
            <div className="list-row" key={e.id}>
              <span className="lr-ico">
                <Icon name="clock" />
              </span>
              <div>
                <b>{titleOf(e.s)}</b>
                <small>
                  {t("Enviada el")} {e.f}
                </small>
              </div>
              <span className="end">
                <span className="state st-rev">{t("Pendiente")}</span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {r.data && !cursos.length ? (
        <p style={{ color: "var(--muted)" }}>
          {t("Todavía no tienes cursos.")} <Link to="/academia">{t("Explora la academia")}</Link>.
        </p>
      ) : null}
      <div className="grid-p three">
        {cursos.map((c) => (
          <Link key={c.course.slug} className="ccard" to={`/academia/curso/${c.course.slug}`}>
            <div className={`ccover tone-${c.course.tone}`}>
              <div className="cbg" />
              <Icon name="heart-pulse" className="cico" />
              <span className="ccat">{c.course.cat}</span>
            </div>
            <div className="cbody">
              <h3>{c.course.title}</h3>
              <div className="progress" role="progressbar" aria-label={t("Avance")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.pct}>
                <i style={{ width: `${c.pct}%` }} />
              </div>
              <small style={{ color: "var(--muted)" }}>{t(`${c.pct}% completado`)}</small>
              {c.constancia ? (
                <span className="badge badge-ok" style={{ alignSelf: "flex-start" }}>
                  <Icon name="award" /> {t("Constancia emitida")}
                </span>
              ) : (
                <span className="link-arrow" style={{ fontSize: 14 }}>
                  {t("Continuar")} <Icon name="arrow-right" />
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
      <h3 style={{ margin: "32px 0 6px", fontSize: 22 }}>{t("Calificaciones e intentos")}</h3>
      <p className="sub" style={{ marginBottom: 14 }}>
        {t(
          "Ves la calificación final del examen de cada curso. La constancia se emite solo con todas las lecciones terminadas y el examen final aprobado.",
        )}
      </p>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">{t("Curso")}</th>
              <th scope="col">{t("Lecciones")}</th>
              <th scope="col">{t("Intentos del examen")}</th>
              <th scope="col">{t("Calificación final")}</th>
              <th scope="col">{t("Examen final")}</th>
            </tr>
          </thead>
          <tbody>
            {cursos.map((c) => {
              const [label, cls] = EXAM_STATE[c.examen];
              return (
                <tr key={c.course.slug}>
                  <td>
                    <b style={{ color: "var(--web-navy)" }}>{c.course.title}</b>
                  </td>
                  <td className="nowrap">{t(`${c.hechas} de ${c.total}`)}</td>
                  <td>{c.intentosMax === null ? t(`${c.intentosUsados} · sin límite`) : t(`${c.intentosUsados} de ${c.intentosMax}`)}</td>
                  <td>{c.notaFinal !== null ? c.notaFinal.toFixed(1) : "—"}</td>
                  <td>
                    <span className={cx("state", cls)}>{t(label)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Link className="panel list-row" style={{ marginTop: 28 }} to="/panel/constancias">
        <span className="lr-ico">
          <Icon name="award" />
        </span>
        <div>
          <b>{t("Mis constancias")}</b>
          <small>{t("De cursos, diplomados y webinars")}</small>
        </div>
        <span className="end">
          <span className="link-arrow">
            {t("Ver todas")} <Icon name="arrow-right" />
          </span>
        </span>
      </Link>
    </>
  );
}

/* ---------------- Constancias ---------------- */

const KIND = { curso: "Curso", diplomado: "Diplomado", webinar: "Webinar" } as const;
const ORIGIN = { migrada: "Migrada de Tutor LMS", academia: "Emitida en la nueva academia", webinar: "Asistencia registrada" } as const;

function MisConstancias() {
  const t = useT();
  const { lang } = useI18n();
  const r = useApi<CertificateSummary[]>("/api/me/constancias");
  return (
    <>
      <div className="main-head">
        <div>
          <h1>{t("Mis constancias")}</h1>
          <p>{t("De cursos, diplomados y webinars · datos de ejemplo")}</p>
        </div>
        <Link className="btn btn-ghost" to={`/verificar/${SAMPLE_FOLIO}`}>
          <Icon name="qr-code" /> {t("Verificar una constancia")}
        </Link>
      </div>
      <div className="notice" style={{ marginBottom: 18 }}>
        <Icon name="shield-check" />
        <span>{t("Una constancia emitida se queda en tu cuenta. Puedes descargarla y verificarla con su folio aunque el curso cambie o deje de estar publicado.")}</span>
      </div>
      <ApiStatus loading={r.loading && !r.data} error={r.error} onRetry={r.refetch} />
      {r.data && !r.data.length ? <p style={{ color: "var(--muted)" }}>{t("Todavía no tienes constancias.")}</p> : null}
      {r.data?.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">{t("Curso o webinar")}</th>
                <th scope="col">{t("Tipo")}</th>
                <th scope="col">{t("Fecha")}</th>
                <th scope="col">{t("Folio")}</th>
                <th scope="col">{t("Origen")}</th>
                <th scope="col">
                  <span className="sr">{t("Descargar")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {r.data.map((c) => (
                <tr key={c.folio}>
                  <td>{c.titulo}</td>
                  <td>{t(KIND[c.tipo])}</td>
                  <td>{c.fecha}</td>
                  <td>
                    <Link to={`/verificar/${c.folio}`}>{c.folio}</Link>
                  </td>
                  <td>
                    <span className="badge badge-soft">{t(ORIGIN[c.origen])}</span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => void downloadCertificate(c.folio, t, lang)} aria-label={`${t("Descargar PDF")} ${c.folio}`}>
                      <Icon name="download" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 10 }}>{t("Las constancias anteriores conservan su folio y su enlace de verificación original.")}</p>
    </>
  );
}

/* ---------------- Club MVZ ---------------- */

const RULE_ICON: Record<ClubRule["id"], IconName> = { cedula: "badge-check", webinar: "video", curso: "award", leccion: "book-open" };

function RedeemConfirm({ r, saldo, onDone }: { r: ClubReward; saldo: number; onDone: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const res = await apiPost<RedeemResult>("/api/me/canjes", { premio: r.id });
      closeModal();
      toast(res.inscripcion ? "Canje confirmado · el curso ya está en Mis cursos" : "Canje confirmado");
      refreshMe();
      onDone();
    } catch (e) {
      setBusy(false);
      toast(e instanceof ApiError ? e.message : "No pudimos hacer el canje");
    }
  };
  return (
    <div className="modal-b">
      <p>
        {t("Vas a canjear")} <b>{r.nombre}</b> {t("por")} <b>{t(`${fmt(r.puntos)} puntos`)}</b>. {t(`Te quedarán ${fmt(saldo - r.puntos)}.`)}
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <button className="btn btn-ghost" type="button" onClick={closeModal}>
          {t("Cancelar")}
        </button>
        <button className="btn btn-primary" type="button" onClick={go} disabled={busy}>
          {t("Canjear")}
        </button>
      </div>
    </div>
  );
}

function InvoiceInfo() {
  const t = useT();
  return (
    <div className="modal-b">
      <div className="notice warn" style={{ marginBottom: 16 }}>
        <Icon name="info" />
        <span>
          {t(
            "Función en evaluación con Kirón. Así funcionaría: subes la factura de tu distribuidor y el sistema lee el producto para sumarte los puntos de la promoción.",
          )}
        </span>
      </div>
      <p style={{ fontSize: 13.5, color: "var(--muted)" }}>{t("Todavía no está disponible: no se suben archivos ni se suman puntos en esta versión.")}</p>
      <button className="btn btn-primary btn-block" type="button" style={{ marginTop: 14 }} onClick={closeModal}>
        {t("Entendido")}
      </button>
    </div>
  );
}

function Club() {
  const t = useT();
  const pts = useApi<PointsBalance>("/api/me/puntos");
  const reglas = useApi<ClubRule[]>("/api/club/reglas");
  const premios = useApi<ClubReward[]>("/api/club/premios");
  const cursos = useApi<MyCoursesResponse>("/api/me/cursos");
  const saldo = pts.data?.saldo ?? 0;
  const mine = new Set((cursos.data?.cursos ?? []).map((c) => c.course.slug));
  const got = (r: ClubReward) => !!pts.data?.canjeados.includes(r.id) || mine.has(r.id);
  const cheapest = (premios.data ?? [])
    .filter((r) => !got(r))
    .map((r) => r.puntos)
    .sort((a, b) => a - b)
    .find((v) => v > saldo);
  const reload = () => {
    pts.refetch();
    cursos.refetch();
  };
  const redeem = (r: ClubReward) => openModal({ title: "Confirmar canje", size: "sm", content: <RedeemConfirm r={r} saldo={saldo} onDone={reload} /> });
  return (
    <>
      <div className="main-head">
        <div>
          <h1>{t("Club MVZ")}</h1>
          <p>{t("Suma puntos y canjéalos por cursos y promociones · valores de ejemplo")}</p>
        </div>
      </div>
      <ApiStatus loading={pts.loading && !pts.data} error={pts.error ?? premios.error ?? reglas.error} onRetry={reload} />
      <div className="two" style={{ marginTop: 0, gridTemplateColumns: "1fr 1.4fr" }}>
        <div className="panel" style={{ background: "linear-gradient(135deg,var(--pp-navy),#3a5806)", color: "#fff", border: 0 }}>
          <span className="badge badge-dark">{t("Saldo")}</span>
          <div style={{ font: "800 64px/1 var(--f-camp)", margin: "18px 0 6px" }} aria-live="polite">
            {pts.data ? fmt(saldo) : "—"}
          </div>
          <p style={{ color: "#dfe2da" }}>{t("puntos disponibles")}</p>
          <div className="progress" style={{ marginTop: 22, background: "rgba(255,255,255,.15)" }}>
            <i style={{ width: `${Math.min(100, saldo / 30)}%`, background: "var(--cyan)" }} />
          </div>
          <p style={{ fontSize: 13, color: "#dfe2da", marginTop: 8 }}>
            {cheapest ? t(`${fmt(cheapest - saldo)} para tu próximo canje`) : t("Ya puedes canjear")}
          </p>
        </div>
        <div className="panel">
          <h3>{t("Cómo sumar")}</h3>
          <div className="howgrid">
            {(reglas.data ?? []).map((r) => (
              <div className="rx-field" style={{ margin: 0 }} key={r.id}>
                <Icon name={RULE_ICON[r.id]} />
                <div>
                  <b>{t(r.nombre)}</b>
                  <small style={{ display: "block", color: "var(--muted)", fontSize: 12 }}>{t(r.frecuencia)}</small>
                </div>
                <span className="badge badge-ok" style={{ marginLeft: "auto" }}>
                  +{r.puntos}
                </span>
              </div>
            ))}
          </div>
          <div className="invoice-box">
            <div>
              <b>{t("Compraste un producto en promoción")}</b>
              <p>{t("Sube tu factura y el sistema identifica el producto para sumarte los puntos.")}</p>
              <span className="badge badge-warn">{t("En evaluación con Kirón")}</span>
            </div>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => openModal({ title: "Sube tu factura", content: <InvoiceInfo /> })}>
              <Icon name="download" /> {t("Subir factura")}
            </button>
          </div>
        </div>
      </div>
      <h3 style={{ margin: "32px 0 14px", fontSize: 22 }}>{t("Canjes")}</h3>
      <div className="grid-p three">
        {(premios.data ?? []).map((r) => {
          const have = got(r);
          const can = saldo >= r.puntos;
          const isCourse = (cursos.data?.cursos ?? []).some((c) => c.course.slug === r.id) || r.icono === "graduation-cap";
          return (
            <div className="qa" key={r.id}>
              <span className="qi">
                <Icon name={(Object.hasOwn(ICONS, r.icono) ? r.icono : "gift") as IconName} />
              </span>
              <b>{r.nombre}</b>
              <small>{t(`${fmt(r.puntos)} puntos`)}</small>
              {have ? (
                <span className="badge badge-ok" style={{ alignSelf: "flex-start" }}>
                  <Icon name="check" /> {t(isCourse ? "Ya lo tienes" : "Canjeado")}
                </span>
              ) : can ? (
                <button className="btn btn-primary btn-sm" type="button" onClick={() => redeem(r)}>
                  {t("Canjear")}
                </button>
              ) : (
                <button className="btn btn-ghost btn-sm" type="button" disabled title={t("Puntos insuficientes")}>
                  {t(`Te faltan ${fmt(r.puntos - saldo)}`)}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12 }}>{t("Kirón agrega y cambia los premios desde su administrador.")}</p>
    </>
  );
}

