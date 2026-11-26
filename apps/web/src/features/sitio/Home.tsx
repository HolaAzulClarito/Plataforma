/* Inicio (home() del demo): carrusel, búsqueda, estadísticas, showcase del panel, destacados, categorías,
   próximo webinar, bento, presencia internacional y CTA. */
import { Link } from "react-router";
import { averageRating, DEMO_USER, type NextWebinar as NextWebinarData } from "@kiron/shared";
import { Icon, type IconName } from "../../components/Icon";
import { ProductCard } from "../../components/ProductCard";
import { ApiStatus, ExtLink } from "../../components/ui";
import { useT } from "../../i18n";
import { scrollToId } from "../../lib/motion";
import { useNow } from "../../lib/time";
import { GatedLink } from "../auth";
import { useMyPoints } from "../panel/useMe";
import { NextWebinar, webinarIsPast } from "../webinars";
import { LINKS, SAMPLE_FOLIO } from "../../app/links";
import { useCategorias, useCursos, usePaises, useProductos, useRepresentantes, useWebinarProximo } from "./data";
import { HeroCarousel } from "./HeroCarousel";

export const HERO_PRODUCT_SLUG = "spirocard-duo-10";

export function Home() {
  const t = useT();
  const points = useMyPoints();
  const productos = useProductos();
  const categorias = useCategorias();
  const paises = usePaises();
  const reps = useRepresentantes();
  const cursos = useCursos();
  const webinar = useWebinarProximo();

  const all = productos.data ?? [];
  const heroProduct = all.find((p) => p.slug === HERO_PRODUCT_SLUG) ?? all.find((p) => p.featured);
  const featured = all.filter((p) => p.featured);
  const avg = cursos.data ? averageRating(cursos.data) : null;
  const activos = paises.data?.activos ?? [];
  const soon = paises.data?.proximamente ?? [];

  const stat = (to: string, value: number | string | null, label: string, count: boolean, onClick?: () => void) => (
    <Link
      className="stat"
      to={to}
      onClick={
        onClick
          ? (e) => {
              e.preventDefault();
              onClick();
            }
          : undefined
      }
    >
      {value === null ? <b aria-hidden="true">–</b> : count ? <b data-count={value} key={String(value)}>{value}</b> : <b>{value}</b>}
      <span>
        {t(label)} <Icon name="arrow-right" />
      </span>
    </Link>
  );

  return (
    <>
      <HeroCarousel product={heroProduct} webinar={webinar.data} course={cursos.data?.[0]}>
        <div className="hero-stats">
          <div className="wrap">
            {stat("/productos", productos.data ? all.length : null, "productos en catálogo", true)}
            {stat("/", paises.data ? activos.length : null, "países con presencia", true, () => scrollToId("intl"))}
            {stat("/representantes", reps.data ? reps.data.zonas.length : null, "zonas de representación", true)}
            {stat("/academia", avg, "calificación de nuestros cursos", false)}
          </div>
        </div>
      </HeroCarousel>

      <section className="sec">
        <div className="wrap showcase">
          <div>
            <span className="eyebrow rv">{t("Nuevo · Academia Kirón")}</span>
            <h2 className="h-lg rv" style={{ marginTop: 16 }}>
              {t("Tu panel: cursos, webinars, constancias y puntos en una sola cuenta")}
            </h2>
            <p className="lead rv" style={{ marginTop: 16 }}>
              {t("Entra con tu cuenta y encuentra todo en un solo lugar: lo que estás estudiando, tus calificaciones, tus constancias y los puntos que puedes canjear.")}
            </p>
            <div className="feat-list">
              <Feat to="/academia?tab=webinars" icon="video" title="Webinars en vivo dentro del sitio" text="Se entra con un clic desde el panel, sin instalar nada. La asistencia queda registrada." />
              <Feat to="/academia?tab=cursos" icon="graduation-cap" title="Cursos y diplomados" text="Tu avance se guarda en cualquier dispositivo. Ves tus calificaciones y los intentos de cada examen." />
              <Feat gated to="/panel/constancias" icon="award" title="Todas tus constancias" text="De cursos, diplomados y webinars. Se quedan en tu cuenta y las descargas cuando quieras." />
              <Feat gated to="/panel/club" icon="gift" title="Club de puntos" text="Puntos por capacitarse, canjeables por cursos y promociones." />
            </div>
            <GatedLink role="mvz" to="/panel" className="btn btn-primary rv">
              {t("Ver mi panel")} <Icon name="arrow-right" />
            </GatedLink>
          </div>
          <PanelMock webinar={webinar.data} stats={{ points: points ?? undefined }} />
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">{t("Catálogo")}</span>
              <h2 className="h-lg">{t("Productos destacados")}</h2>
              <p className="lead">{t("Cada producto con su clasificación y su ficha técnica para médicos registrados.")}</p>
            </div>
            <Link className="btn btn-ghost" to="/productos">
              {t("Ver más productos")} <Icon name="arrow-right" />
            </Link>
          </div>
          <ApiStatus loading={productos.loading && !productos.data} error={productos.error} onRetry={productos.refetch} />
          <div className="grid-p">
            {featured.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
          <div className="cat-strip" style={{ marginTop: 36 }}>
            {(categorias.data ?? []).map((c) => (
              <Link key={c} className="cat-pill rv" to={`/productos?cat=${encodeURIComponent(c)}`}>
                {t(c)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">{t("Academia")}</span>
              <h2 className="h-lg">{t("Participa en nuestros webinars")}</h2>
            </div>
            <Link className="btn btn-ghost" to="/academia?tab=webinars">
              {t("Ver webinars")} <Icon name="arrow-right" />
            </Link>
          </div>
          <ApiStatus loading={webinar.loading && !webinar.data} error={webinar.error} onRetry={webinar.refetch} />
          {webinar.data ? <NextWebinar webinar={webinar.data} /> : null}
        </div>
      </section>

      <section className="sec sec-alt">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">{t("Para el médico veterinario")}</span>
              <h2 className="h-lg">{t("Lo que encuentras aquí")}</h2>
            </div>
          </div>
          <div className="bento">
            <Link className="tile navy c3 r2 rv" to="/academia">
              <span className="ti">
                <Icon name="graduation-cap" />
              </span>
              <h3>{t("Academia Kirón")}</h3>
              <p>{t("Cursos, diplomados y webinars con constancia verificable por QR.")}</p>
              <div className="big-num" style={{ marginTop: 40 }}>
                {avg ?? "–"}
              </div>
              <p>{t("calificación promedio de los cursos con reseñas")}</p>
              <span className="tile-go">
                {t("Ver academia")} <Icon name="arrow-right" />
              </span>
            </Link>
            <Tile to="/academia?tab=webinars" cls="c3" icon="video" title="Webinars en vivo" text="Se transmiten dentro del sitio. Entras con tu cuenta, sin instalar nada." go="Ver próximo webinar" />
            <Tile to="/representantes" cls="c3" icon="users" title="Representantes" text="El equipo de Kirón en tu zona." go="Ver representantes" />
            <Tile gated to="/panel/club" cls="abyss c2" icon="gift" title="Club MVZ" text="Puntos por capacitarte, canjeables por cursos y promociones." go="Ver mis puntos" />
            <Tile to={`/verificar/${SAMPLE_FOLIO}`} cls="c2" icon="qr-code" title="Verificar constancia" text="Cualquier constancia se valida con su folio o su QR." go="Verificar" />
            <Tile to="/farmacovigilancia" cls="c2" icon="shield-check" title="Farmacovigilancia" text="Reporta un evento adverso directo al área responsable." go="Hacer un reporte" />
          </div>
        </div>
      </section>

      <section className="sec sec-dark" id="intl">
        <div className="wrap split">
          <div>
            <span className="eyebrow light">{t("Presencia internacional")}</span>
            <h2 className="h-lg" style={{ marginTop: 16 }}>
              {paises.data ? t(`Presencia en ${activos.length} países`) : t("Presencia internacional")}
            </h2>
            <p className="lead" style={{ color: "#c5c9bf", marginTop: 16 }}>
              {t("México, Centroamérica, Sudamérica, Medio Oriente y África occidental.")}
              {soon.length ? (
                <>
                  {" "}
                  {t("Próximamente")} {soon.map((c) => t(c)).join(` ${t("y")} `)}.
                </>
              ) : null}
            </p>
            <div className="countries">
              {activos.map((c) => (
                <span key={c} className="country rv">
                  {t(c)}
                </span>
              ))}
            </div>
          </div>
          <div className="cta-band rv" style={{ gridTemplateColumns: "1fr", padding: 48 }}>
            <div className="ring" />
            <h2 className="h-md" style={{ fontSize: 32 }}>
              {t("¿Hablamos?")}
            </h2>
            <p>{t("Escríbenos o llámanos. Te atiende el equipo de Kirón.")}</p>
            <div className="acts" style={{ justifyContent: "flex-start", marginTop: 22, flexWrap: "wrap" }}>
              <ExtLink href={LINKS.wa} className="btn btn-accent">
                <Icon name="whatsapp" /> {t("Mensaje de WhatsApp")}
              </ExtLink>
              <a className="btn btn-outline-light" href={LINKS.tel}>
                <Icon name="phone" /> {LINKS.telLabel}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Feat({ to, icon, title, text, gated }: { to: string; icon: IconName; title: string; text: string; gated?: boolean }) {
  const t = useT();
  const body = (
    <>
      <span className="fi">
        <Icon name={icon} />
      </span>
      <div>
        <h4>
          {t(title)} <Icon name="arrow-right" />
        </h4>
        <p>{t(text)}</p>
      </div>
    </>
  );
  return gated ? (
    <GatedLink role="mvz" to={to} className="feat rv">
      {body}
    </GatedLink>
  ) : (
    <Link className="feat rv" to={to}>
      {body}
    </Link>
  );
}

function Tile({ to, cls, icon, title, text, go, gated }: { to: string; cls: string; icon: IconName; title: string; text: string; go: string; gated?: boolean }) {
  const t = useT();
  const body = (
    <>
      <span className="ti">
        <Icon name={icon} />
      </span>
      <h3>{t(title)}</h3>
      <p>{t(text)}</p>
      <span className="tile-go">
        {t(go)} <Icon name="arrow-right" />
      </span>
    </>
  );
  const className = `tile ${cls} rv`;
  return gated ? (
    <GatedLink role="mvz" to={to} className={className}>
      {body}
    </GatedLink>
  ) : (
    <Link className={className} to={to}>
      {body}
    </Link>
  );
}

/* Mock del panel del médico (decorativo). Corrección 2: sin cifras fijas. Mientras no haya datos del médico en la API
   se muestran etiquetas neutras; cuando el agente de panel exponga sus datos, pásalos en `stats`. */
export interface PanelMockStats {
  points?: number;
  courses?: number;
  certificates?: number;
}

export function PanelMock({ webinar, stats = {} }: { webinar?: NextWebinarData; stats?: PanelMockStats }) {
  const t = useT();
  const now = useNow();
  const live = webinar && !webinarIsPast(webinar, now);
  const fmt = (n: number) => n.toLocaleString("es-MX");
  const cells: Array<[string, string, boolean]> = [
    ["Puntos", stats.points !== undefined ? fmt(stats.points) : t("Tu saldo"), stats.points !== undefined],
    ["Cursos en curso", stats.courses !== undefined ? fmt(stats.courses) : t("Tu avance"), stats.courses !== undefined],
    ["Constancias", stats.certificates !== undefined ? fmt(stats.certificates) : t("Con folio y QR"), stats.certificates !== undefined],
  ];
  return (
    <div className="pmock rv" aria-hidden="true">
      <div className="pmock-bar">
        <i />
        <i />
        <i />
        <span>kironmexico.com/mi-panel</span>
      </div>
      <div className="pmock-body">
        <p className="pm-hi">
          {t("Buenas tardes")}, {DEMO_USER.name.replace("Laura ", "")}
        </p>
        {webinar ? (
          <div className="pm-live">
            <span className="pm-badge">
              <i /> {live ? t("EN VIVO") : t("Webinar concluido")}
            </span>
            <b>{webinar.title}</b>
            <small>
              {webinar.deg} {webinar.speaker}
            </small>
            <span className="pm-btn">
              <Icon name="play" /> {live ? t("Entrar") : t("Ver grabaciones")}
            </span>
          </div>
        ) : null}
        <div className="pm-row">
          {cells.map(([label, value, isNum]) => (
            <div key={label}>
              <small>{t(label)}</small>
              <b className={isNum ? undefined : "pm-neutral"}>{value}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
