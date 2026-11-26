/* Carrusel del inicio (3 destacados). Autoplay cada 7 s que se pausa con hover, foco dentro del carrusel o un modal
   abierto, y se desactiva con prefers-reduced-motion (heroAuto / APP.hero / APP.heroGo del demo). */
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { isoToMx, type Course, type NextWebinar as NextWebinarData, type Product } from "@kiron/shared";
import { Icon } from "../../components/Icon";
import { ProductImage } from "../../components/ProductCard";
import { useT } from "../../i18n";
import { prefersReducedMotion } from "../../lib/motion";
import { useNow } from "../../lib/time";
import { isModalOpen } from "../../state/modal";
import { RECORDINGS_HREF, WebinarDate, webinarIsPast, webinarReg } from "../webinars";

export const HERO_INTERVAL = 7000;
const SLIDES = 3;

/* `children` se pinta al final de la sección (las estadísticas del inicio), como en el demo. */
export function HeroCarousel({ product, webinar, course, children }: { product?: Product; webinar?: NextWebinarData; course?: Course; children?: ReactNode }) {
  const t = useT();
  const [cur, setCur] = useState(0);
  const [restart, setRestart] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const now = useNow();
  const past = webinar ? webinarIsPast(webinar, now) : false;

  const go = useCallback((i: number, manual = true) => {
    setCur(((i % SLIDES) + SLIDES) % SLIDES);
    if (manual) setRestart((r) => r + 1);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = setInterval(() => {
      const el = ref.current;
      if (!el) return;
      if (el.matches(":hover") || el.contains(document.activeElement) || isModalOpen()) return;
      setCur((c) => (c + 1) % SLIDES);
    }, HERO_INTERVAL);
    return () => clearInterval(id);
  }, [restart]);

  const slide = (i: number) => ({
    className: i === cur ? "hc-slide on" : "hc-slide",
    role: "group",
    "aria-label": t(`${i + 1} de ${SLIDES}`),
  });

  return (
    <section className="hero hero-car" id="hcar" ref={ref} aria-roledescription="carrusel" aria-label={t("Destacados de Kirón")}>
      <div className="wrap hc-wrap">
        <div {...slide(0)}>
          <div className="hero-copy">
            <span className="eyebrow light">{t("Laboratorios Kirón México")}</span>
            <h1 className="h-xl" style={{ marginTop: 22 }}>
              {t("Cuidando la salud de")} <em>{t("tu mejor amigo")}</em>
            </h1>
            <p className="lead">{t("Productos veterinarios innovadores y educación continua para el médico veterinario, en un solo lugar.")}</p>
            <div className="hc-ctas">
              <Link className="btn btn-accent" to="/productos">
                {t("Ver productos")} <Icon name="arrow-right" />
              </Link>
              <Link className="btn btn-ghost" to="/academia">
                {t("Ir a la academia")}
              </Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <i className="hb hb1" />
            <i className="hb hb2" />
            <i className="hb hb3" />
            {product ? (
              <>
                <span className="hero-plate">
                  <ProductImage product={product} large />
                </span>
                <span className="hero-tag">
                  <b>{t("Nuevo")}</b> {product.name}
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div {...slide(1)}>
          {webinar ? (
            <>
              <div className="hero-copy">
                <span className="eyebrow light">{t(past ? "Webinar concluido" : "Próximo webinar · gratuito")}</span>
                <h2 className="h-xl" style={{ marginTop: 22 }}>
                  {webinar.title}
                </h2>
                <p className="lead">{webinar.sub}</p>
                <p className="hc-meta">
                  <Icon name="calendar" /> {t(webinar.dow)} {isoToMx(webinar.date)} · {webinar.time} ({t("México")}){" "}
                  <span>
                    {webinar.deg} {webinar.speaker}
                  </span>
                </p>
                <div className="hc-ctas">
                  {past ? (
                    <Link className="btn btn-accent" to={RECORDINGS_HREF}>
                      <Icon name="circle-play" /> {t("Ver grabaciones")}
                    </Link>
                  ) : (
                    <button className="btn btn-accent" type="button" onClick={() => webinarReg(webinar)}>
                      <Icon name="calendar" /> {t("Registrarme")}
                    </button>
                  )}
                  <Link className="btn btn-ghost" to="/academia?tab=webinars">
                    {t("Ver webinars")}
                  </Link>
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <i className="hb hb1" />
                <i className="hb hb2" />
                <i className="hb hb3" />
                <span className="hero-plate hc-date">
                  <WebinarDate w={webinar} />
                </span>
                <span className="hero-tag">
                  {past ? (
                    <b>{t("Webinar concluido")}</b>
                  ) : (
                    <>
                      <b>{t("En vivo")}</b> {webinar.time}
                    </>
                  )}
                </span>
              </div>
            </>
          ) : null}
        </div>

        <div {...slide(2)}>
          <div className="hero-copy">
            <span className="eyebrow light">{t("Academia Kirón · Diplomados")}</span>
            <h2 className="h-xl" style={{ marginTop: 22 }}>
              {t("Diplomado Integral en Especialidades Clínicas Veterinarias")}
            </h2>
            <p className="lead">{t("Estudia a tu ritmo, presenta el examen de cada bloque y descarga tu constancia desde tu panel.")}</p>
            <div className="hc-ctas">
              <Link className="btn btn-accent" to="/academia?tab=diplomados">
                {t("Ver diplomados")} <Icon name="arrow-right" />
              </Link>
              <Link className="btn btn-ghost" to="/academia?tab=cursos">
                {t("Ver cursos")}
              </Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <i className="hb hb1" />
            <i className="hb hb2" />
            <i className="hb hb3" />
            <span className="hero-plate hc-course">
              {course?.img ? <CourseImg src={course.img} /> : null}
              <Icon name="graduation-cap" />
            </span>
            {course ? (
              <span className="hero-tag">
                <b>{t("Diplomado")}</b> {course.title.split(" · ")[0]}
              </span>
            ) : null}
          </div>
        </div>

        <div className="hc-nav">
          <button className="hc-arrow" type="button" aria-label={t("Anterior")} onClick={() => go(cur - 1)}>
            <Icon name="chevron-left" />
          </button>
          <div className="hc-dots">
            {Array.from({ length: SLIDES }, (_, i) => (
              <button
                key={i}
                type="button"
                className={i === cur ? "on" : undefined}
                aria-label={t(`Ir al destacado ${i + 1}`)}
                aria-current={i === cur ? "true" : undefined}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button className="hc-arrow" type="button" aria-label={t("Siguiente")} onClick={() => go(cur + 1)}>
            <Icon name="chevron-right" />
          </button>
        </div>
      </div>
      <HeroFind />
      {children}
    </section>
  );
}

function CourseImg({ src }: { src: string }) {
  const [ok, setOk] = useState(true);
  return ok ? <img src={src} alt="" loading="lazy" onError={() => setOk(false)} /> : null;
}

const CHIPS = ["Oftálmicos", "Cardiológicos", "Endoparasiticidas", "Biológicos"];

/* Búsqueda y chips bajo el carrusel (APP.search). */
function HeroFind() {
  const t = useT();
  const navigate = useNavigate();
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    navigate("/productos?q=" + encodeURIComponent(q));
  };
  return (
    <div className="hero-find">
      <div className="wrap">
        <form className="hero-search" role="search" onSubmit={onSubmit}>
          <Icon name="search" />
          <input name="q" placeholder={t("Busca por producto o clasificación")} aria-label={t("Busca por producto o clasificación")} />
          <button className="btn btn-accent" type="submit">
            {t("Buscar")}
          </button>
        </form>
        <div className="hero-chips">
          {CHIPS.map((c) => (
            <Link key={c} to={`/productos?q=${encodeURIComponent(c)}`}>
              {t(c)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
