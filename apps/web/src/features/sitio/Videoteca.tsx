/* /videoteca (?tab=productos|tutoriales, y cursos|webinars heredadas) y /recetas-cuantificadas.
   Los videos de YouTube solo se reproducen con sesión (candado y modal de inicio de sesión si no la hay). */
import { Link, useSearchParams } from "react-router";
import type { Video } from "@kiron/shared";
import { Icon } from "../../components/Icon";
import { Price } from "../../components/ProductCard";
import { ApiStatus, Notice, PageHead } from "../../components/ui";
import { useT } from "../../i18n";
import { cx } from "../../lib/cx";
import { openModal } from "../../state/modal";
import { getSession, useSession } from "../../state/session";
import { toast } from "../../state/toasts";
import { openLogin } from "../auth";
import { VT_TABS } from "../../app/links";
import { useCursos, useVideos } from "./data";

function VtNav({ cur }: { cur: string }) {
  const t = useT();
  return (
    <div className="atabs vt-tabs">
      {VT_TABS.map(([tab, label, href]) => (
        <Link key={tab} className={cx(cur === tab && "on")} to={href} aria-current={cur === tab ? "page" : undefined}>
          {t(label)}
        </Link>
      ))}
    </div>
  );
}

function YtModal({ video }: { video: Video }) {
  return (
    <div className="modal-b">
      <div className="yt-frame">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video[1]}?autoplay=1&rel=0`}
          title={video[0]}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

/* APP.yt: con sesión abre el video; sin sesión pide iniciarla y avisa. */
export function playVideo(video: Video): void {
  if (!getSession().role) {
    openLogin({ role: "mvz", stay: true, next: () => playVideo(video) });
    toast("Inicia sesión para ver los videos de la videoteca");
    return;
  }
  openModal({ title: video[0], content: <YtModal video={video} /> });
}

function YtCard({ video }: { video: Video }) {
  const t = useT();
  return (
    <button className="vcard yt rv" type="button" onClick={() => playVideo(video)}>
      <div className="vthumb yt-th">
        <img src={`https://i.ytimg.com/vi/${video[1]}/hqdefault.jpg`} alt={video[0]} loading="lazy" width={480} height={360} />
        <span className="vplay">
          <Icon name="play" />
        </span>
      </div>
      <div className="pbody">
        <span className="pcat">{t(video[2] || "Video de producto")}</span>
        <span className="pname">{video[0]}</span>
      </div>
    </button>
  );
}

function ProNote() {
  const t = useT();
  const { role } = useSession();
  if (role) return null;
  return (
    <div className="notice" style={{ marginBottom: 22 }}>
      <Icon name="lock" />
      <span>{t("Contenido de uso exclusivo para profesionistas de la salud animal. Inicia sesión o regístrate para ver los videos.")}</span>
      <button className="btn btn-primary btn-sm" type="button" style={{ marginLeft: "auto" }} onClick={() => openLogin({ role: "mvz", stay: true })}>
        {t("Iniciar sesión")}
      </button>
    </div>
  );
}

function VideosProductos() {
  const t = useT();
  const videos = useVideos();
  return (
    <>
      <ProNote />
      <ApiStatus loading={videos.loading && !videos.data} error={videos.error} onRetry={videos.refetch} />
      <div className="grid-p">
        {(videos.data ?? []).map((v) => (
          <YtCard key={v[1]} video={v} />
        ))}
      </div>
      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 16 }}>{t("Videos publicados en kironmexico.com y en el canal de YouTube de Laboratorios Kirón.")}</p>
    </>
  );
}

function VideosCursos() {
  const t = useT();
  const cursos = useCursos();
  return (
    <>
      <ApiStatus loading={cursos.loading && !cursos.data} error={cursos.error} onRetry={cursos.refetch} />
      <div className="grid-p three">
        {(cursos.data ?? []).map((c) => (
          <Link className="panel vt-link rv" key={c.slug} to={`/academia/curso/${c.slug}`}>
            <span className="badge badge-soft">{t(c.cat)}</span>
            <h3 style={{ marginTop: 12 }}>{c.title}</h3>
            <p className="sub">
              {c.lessons ? `${c.lessons} ${t("lecciones")} · ` : ""}
              {c.price ? <Price amount={c.price} /> : t("Gratuito")}
            </p>
            <span className="link-arrow">
              {t("Ver curso")} <Icon name="arrow-right" />
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}

export function Videoteca() {
  const t = useT();
  const [params] = useSearchParams();
  const tab = params.get("tab") || "productos";
  let body;
  if (tab === "cursos") body = <VideosCursos />;
  else if (tab === "webinars")
    body = (
      <Notice>
        {t("Las grabaciones de los webinars de Kirón están hoy detrás del acceso de médicos del sitio actual. Se migran a esta sección, con su flyer, ponente y constancia, cuando recibamos los accesos.")}
      </Notice>
    );
  else if (tab === "tutoriales") body = <Notice>{t("Los tutoriales publicados en el sitio actual de Kirón se migran a esta sección.")}</Notice>;
  else body = <VideosProductos />;
  return (
    <>
      <PageHead eyebrow="Videoteca" title="Videoteca Kirón" lead="Videos de producto, tutoriales y recetas cuantificadas para el médico veterinario." />
      <section className="sec" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <VtNav cur={tab} />
          {body}
        </div>
      </section>
    </>
  );
}

function RecipeModal() {
  const t = useT();
  return (
    <div className="modal-b">
      <div className="kstage-wrap">
        <div className="kstage">
          <span className="kplate">
            <img src="/img/kiron-logo.png" alt="Kirón" />
          </span>
          <span className="vlabel">{t("Video de ejemplo")}</span>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 10 }}>
        {t("Video de ejemplo. En la plataforma se reproduce el tutorial que hoy está en el sitio actual.")}
      </p>
    </div>
  );
}

/* APP.recipe */
export function playRecipe(): void {
  if (!getSession().role) {
    openLogin({ role: "mvz", stay: true, next: playRecipe });
    toast("Para acceder a este contenido necesitas una cuenta");
    return;
  }
  openModal({ title: "Recetas cuantificadas · Tutorial 1", content: <RecipeModal /> });
}

const SOON = [2, 3, 4];

export function Recetas() {
  const t = useT();
  const { role } = useSession();
  return (
    <>
      <PageHead eyebrow="Videoteca" title="Recetas cuantificadas" lead="Un espacio hecho para ti" />
      <section className="sec" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <VtNav cur="recetas" />
          <div className="two" style={{ margin: 0, gridTemplateColumns: "1.2fr 1fr", alignItems: "center" }}>
            <div className="player rec-player" id="recvid">
              <span className="ptitle">{t("Recetas cuantificadas · Tutorial 1")}</span>
              <button className="playbtn" type="button" aria-label={t("Ver el tutorial")} onClick={playRecipe}>
                <Icon name="play" />
              </button>
            </div>
            <div>
              <span className="eyebrow">{t("Tutorial 1")}</span>
              <h2 className="h-md" style={{ marginTop: 12 }}>
                {t("Todo sobre recetas cuantificadas, en un solo lugar")}
              </h2>
              <p style={{ color: "var(--muted)", marginTop: 12 }}>{t("Ya está disponible nuestro primer tutorial y muy pronto sumaremos más videos.")}</p>
              <button className="btn btn-accent" type="button" style={{ marginTop: 20 }} onClick={playRecipe}>
                <Icon name="circle-play" /> {t("Ver el tutorial")}
              </button>
              {role ? null : (
                <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 12 }}>
                  <Icon name="lock" /> {t("Para acceder a este contenido necesitas una cuenta.")}
                </p>
              )}
            </div>
          </div>
          <h3 style={{ margin: "40px 0 14px", fontSize: 22 }}>{t("Próximos videos")}</h3>
          <div className="grid-p three">
            {SOON.map((n) => (
              <div className="panel soon-card" key={n}>
                <span className="lr-ico">
                  <Icon name="clock" />
                </span>
                <b>{t(`Tutorial ${n}`)}</b>
                <small>{t("Próximamente")}</small>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
