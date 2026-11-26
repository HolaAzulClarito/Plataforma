/* Bloque "Próximo webinar" (nextWebinar() del demo). Lo usan el inicio y la academia.
   Corrección 3: cuenta regresiva hacia startsAt; si ya pasó, muestra "Webinar concluido · ver grabaciones". */
import { Link } from "react-router";
import type { NextWebinar as NextWebinarData } from "@kiron/shared";
import { Countdown } from "../../components/Countdown";
import { Icon } from "../../components/Icon";
import { useT } from "../../i18n";
import { useNow } from "../../lib/time";
import { useSession } from "../../state/session";
import { downloadWebinarIcs, enterLive, useWebinarRegistered, webinarReg } from "./actions";
import { webinarIsPast, webinarStart, webinarTimeZones } from "./status";

export const RECORDINGS_HREF = "/academia?tab=webinars&sec=grabaciones";

/* Fecha en bloque (.pp-date). */
export function WebinarDate({ w }: { w: NextWebinarData }) {
  const t = useT();
  return (
    <div className="pp-date">
      <span className="wd">{t(w.dow)}</span>
      <span className="d">{w.day}</span>
      <span className="ym">
        <span>{w.year}</span>
        <span>{t(w.month)}</span>
      </span>
    </div>
  );
}

export function NextWebinar({ webinar: w, now: fixedNow }: { webinar: NextWebinarData; now?: number }) {
  const t = useT();
  const { role } = useSession();
  const registered = useWebinarRegistered();
  const liveNow = useNow();
  const now = fixedNow ?? liveNow;
  const past = webinarIsPast(w, now);

  if (past) {
    return (
      <div className="next-webinar rv">
        <div className="nw-body">
          <span className="badge badge-soft">{t("Webinar concluido")}</span>
          <h3>{w.title}</h3>
          <p className="sub">{w.sub}</p>
          <div className="speaker-line">
            {t("IMPARTIDO POR")}
            <b>
              <span>{w.deg}</span> {w.speaker}
            </b>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
            <Link className="btn btn-accent" to={RECORDINGS_HREF}>
              <Icon name="circle-play" /> {t("Ver grabaciones")}
            </Link>
          </div>
          <p className="nw-note">
            <Icon name="info" /> {t("Este webinar ya se transmitió. Las grabaciones están disponibles para médicos registrados.")}
          </p>
        </div>
        <div className="nw-side">
          <WebinarDate w={w} />
          <Link className="wb-ended" to={RECORDINGS_HREF}>
            {t("Webinar concluido · ver grabaciones")} <Icon name="arrow-right" />
          </Link>
        </div>
      </div>
    );
  }

  const logged = role !== null;
  return (
    <div className="next-webinar rv">
      <div className="nw-body">
        <span className="badge badge-new">{t("Próximo webinar · gratuito")}</span>
        <h3>{w.title}</h3>
        <p className="sub">{w.sub}</p>
        <div className="speaker-line">
          {t("IMPARTIDO POR")}
          <b>
            <span>{w.deg}</span> {w.speaker}
          </b>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
          {logged && registered ? (
            <>
              <button className="btn btn-accent" type="button" onClick={() => enterLive()}>
                <Icon name="play" /> {t("Entrar al webinar")}
              </button>
              <button className="btn btn-outline-light" type="button" onClick={() => downloadWebinarIcs(w)}>
                <Icon name="calendar" /> {t("Agregar a mi calendario")}
              </button>
            </>
          ) : (
            <button className="btn btn-accent" type="button" onClick={() => webinarReg(w)}>
              <Icon name="calendar" /> {t("Registrarme")}
            </button>
          )}
          <Link className="btn btn-outline-light" to={RECORDINGS_HREF}>
            {t("Ver grabaciones")}
          </Link>
        </div>
        <p className="nw-note">
          <Icon name="info" />{" "}
          {t(
            "Exclusivo para profesionales de la salud animal. Se transmite dentro del sitio: entras con tu cuenta, sin instalar Zoom." +
              (logged && registered ? " En el demo puedes entrar antes de la hora para ver la sala." : ""),
          )}
        </p>
      </div>
      <div className="nw-side">
        <WebinarDate w={w} />
        <Countdown target={webinarStart(w)} now={now} />
        <table className="tz">
          <tbody>
            {webinarTimeZones(w).map(([h, where]) => (
              <tr key={where}>
                <th>{h}</th>
                <td>{t(where)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
