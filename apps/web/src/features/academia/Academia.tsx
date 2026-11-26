/* /academia (academia() del demo): pestañas Todo, Cursos, Diplomados y Webinars; ?sec=grabaciones baja a la sección. */
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import type { Course, Enrollment, NextWebinar as NextWebinarData } from "@kiron/shared";
import { ApiStatus, Icon, PageHead, Price } from "../../components";
import { useT } from "../../i18n";
import { useApi } from "../../lib/api";
import { cx } from "../../lib/cx";
import { scrollToId } from "../../lib/motion";
import { useSession } from "../../state/session";
import { AC_TABS } from "../../app/links";
import { NextWebinar } from "../webinars/NextWebinar";

type AcTab = (typeof AC_TABS)[number][0];

/* Inscripciones del médico (solo con rol mvz; el administrador no tiene /api/me). */
export function useMyEnrollments() {
  const { role } = useSession();
  return useApi<Enrollment[]>(role === "mvz" ? "/api/me/inscripciones" : null);
}

/* Tarjeta de curso (ccard del demo). */
export function CourseCard({ c, enr }: { c: Course; enr?: Enrollment }) {
  const t = useT();
  const enrolled = enr?.st === "approved";
  const pending = enr?.st === "pending";
  return (
    <Link className="ccard rv" to={`/academia/curso/${c.slug}`}>
      <div className={`ccover tone-${c.tone}`}>
        <div className="cbg" />
        <Icon name={c.price ? "award" : "heart-pulse"} className="cico" />
        {c.img ? <img className="cimg" src={c.img} alt="" loading="lazy" onError={(e) => e.currentTarget.remove()} /> : null}
        <span className="ccat">{c.cat}</span>
        {enrolled ? (
          <span className="ccat enrolled">
            <Icon name="check" /> {t("Inscrito")}
          </span>
        ) : pending ? (
          <span className="ccat enrolled pend">
            <Icon name="clock" /> {t("Solicitud en revisión")}
          </span>
        ) : null}
      </div>
      <div className="cbody">
        <h3>{c.title}</h3>
        <div className="cmeta">
          {c.lessons > 1 ? (
            <span>
              <Icon name="book-open" /> {t(`${c.lessons - 1} lecciones`)}
            </span>
          ) : null}
          {c.reviews ? (
            <span>
              <Icon name="star" className="star" /> {c.rating.toFixed(1)} ({c.reviews})
            </span>
          ) : null}
          <span>
            <Icon name="qr-code" /> {t("Constancia")}
          </span>
        </div>
        <div className="price">
          {enrolled ? (
            <span className="free" style={{ color: "var(--web-blue)" }}>
              {t("Continuar curso")}
            </span>
          ) : c.price ? (
            <Price amount={c.price} was={c.was} />
          ) : (
            <span className="free">{t("GRATUITO")}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function CourseGrid({ list, mine }: { list: Course[]; mine: Enrollment[] }) {
  return (
    <div className="grid-p three">
      {list.map((c) => (
        <CourseCard key={c.slug} c={c} enr={mine.find((e) => e.s === c.slug)} />
      ))}
    </div>
  );
}

export function AcademiaPage() {
  const t = useT();
  const [params] = useSearchParams();
  const raw = params.get("tab") ?? "";
  const tab: AcTab | "" = AC_TABS.some(([k]) => k === raw) ? (raw as AcTab) : "";
  const sec = params.get("sec");
  const cursos = useApi<Course[]>("/api/cursos");
  const webinar = useApi<NextWebinarData>("/api/webinars/proximo");
  const mine = useMyEnrollments().data ?? [];
  const list = cursos.data ?? [];
  const dipl = list.filter((c) => c.price);
  const free = list.filter((c) => !c.price);
  const ready = !!cursos.data && !!webinar.data;

  /* Como el demo: con ?sec= baja a la sección cuando ya se pintó. */
  useEffect(() => {
    if (!sec || !ready) return;
    const id = setTimeout(() => scrollToId(sec), 120);
    return () => clearTimeout(id);
  }, [sec, ready]);

  const status = <ApiStatus loading={cursos.loading && !cursos.data} error={cursos.error} onRetry={cursos.refetch} />;

  const sDipl = (
    <section className="sec sec-alt" id="diplomados" key="d">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <span className="eyebrow">{t("Diplomados")}</span>
            <h2 className="h-lg">{t("Diplomados por bloques, con examen y constancia")}</h2>
          </div>
        </div>
        {status}
        <CourseGrid list={dipl} mine={mine} />
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 18 }}>
          {t("Precios en MXN publicados en el sitio actual. La inscripción a diplomados la confirma el equipo de Academia; el sitio no cobra en línea.")}
        </p>
      </div>
    </section>
  );
  const sCur = (
    <section className="sec" id="cursos" key="c">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <span className="eyebrow">{t("Cursos")}</span>
            <h2 className="h-lg">{t("Cursos gratuitos para aprender a tu ritmo")}</h2>
          </div>
        </div>
        {tab === "cursos" ? status : null}
        <CourseGrid list={free} mine={mine} />
      </div>
    </section>
  );
  const sWeb = (
    <section className={cx("sec", !tab && "sec-alt")} id="webinars" key="w">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <span className="eyebrow">{t("Webinars")}</span>
            <h2 className="h-lg">{t("Webinars en vivo")}</h2>
          </div>
        </div>
        <ApiStatus loading={webinar.loading && !webinar.data} error={webinar.error} onRetry={webinar.refetch} />
        {webinar.data ? <NextWebinar webinar={webinar.data} /> : null}
        <div className="sec-head" id="grabaciones" style={{ marginTop: 56 }}>
          <div>
            <span className="eyebrow">{t("Grabaciones")}</span>
            <h2 className="h-md" style={{ marginTop: 12 }}>
              {t("Webinars anteriores")}
            </h2>
            <p className="lead">{t("Disponibles para médicos registrados.")}</p>
          </div>
        </div>
        <div className="notice">
          <Icon name="info" />
          <span>
            {t(
              "Las grabaciones de los webinars de Kirón están hoy detrás del acceso de médicos del sitio actual. Se migran a esta sección, con su flyer, ponente y constancia, cuando recibamos los accesos.",
            )}
          </span>
        </div>
      </div>
    </section>
  );

  return (
    <>
      <PageHead
        eyebrow="Academia Kirón"
        title="Educación continua para el médico veterinario"
        lead="Diplomados, cursos y webinars en vivo con constancia verificable. Todo en tu cuenta, desde el celular o la computadora."
      />
      <div className="wrap" style={{ paddingTop: 28 }}>
        <nav className="atabs ac-tabs" aria-label={t("Secciones de la academia")}>
          <Link className={tab ? undefined : "on"} to="/academia" aria-current={tab ? undefined : "page"}>
            {t("Todo")}
          </Link>
          {AC_TABS.map(([k, label]) => (
            <Link key={k} className={tab === k ? "on" : undefined} to={`/academia?tab=${k}`} aria-current={tab === k ? "page" : undefined}>
              {t(label)}
            </Link>
          ))}
        </nav>
      </div>
      {tab === "diplomados" ? sDipl : tab === "cursos" ? sCur : tab === "webinars" ? sWeb : [sDipl, sCur, sWeb]}
    </>
  );
}
