/* Webinars: el próximo webinar real ("proximo") y los que crea el equipo desde el administrador. */
import { randomBytes } from "node:crypto";
import { isoToMx, type AdminWebinar, type AdminWebinarList, type MyWebinarStatus, type WebinarCreateRequest, type WebinarSummary } from "@kiron/shared";
import { db, type StoredWebinar } from "../../store";
import { now } from "../../lib/clock";
import { badRequest, conflict, notFound } from "../../lib/http";
import { awardRule } from "../club/service";
import { certificateFor, issueCertificate, summary } from "../constancias/service";

/* Slug reservado del próximo webinar real. GET /api/webinars/proximo es una excepción explícita del contrato: devuelve
   NextWebinar (contador del inicio), no WebinarSummary. Por eso ningún webinar nuevo puede usar este slug. */
export const NEXT_SLUG = "proximo";
/* [SUPUESTO] dominio público de la landing; se confirma con el dominio definitivo. */
const landingUrl = (slug: string) => `kironmexico.com/es/webinar/${slug}`;
const STREAM_SERVER = "rtmps://live.cloudflare.com:443/live/";

const nextSummary = (): WebinarSummary => {
  const w = db().webinar;
  return {
    slug: NEXT_SLUG,
    titulo: w.title,
    subtitulo: w.sub,
    tituloEn: "",
    subtituloEn: "",
    grado: w.deg,
    ponente: w.speaker,
    inicio: w.startsAt,
    fecha: isoToMx(w.date),
    hora: w.time.slice(0, 5),
    duracion: 90,
    umbral: 45,
    flyer: w.img,
    modo: "cloudflare",
    publicado: true,
  };
};

const toSummary = (w: StoredWebinar): WebinarSummary => ({
  slug: w.slug,
  titulo: w.titulo,
  subtitulo: w.subtitulo,
  tituloEn: w.tituloEn,
  subtituloEn: w.subtituloEn,
  grado: w.grado,
  ponente: w.ponente,
  inicio: `${w.fecha}T${w.hora}:00-06:00`,
  fecha: isoToMx(w.fecha),
  hora: w.hora,
  duracion: w.duracion,
  umbral: w.umbral,
  flyer: w.flyer,
  modo: w.modo,
  publicado: w.publicado,
});

const toAdmin = (w: StoredWebinar): AdminWebinar => ({
  ...toSummary(w),
  servidor: w.modo === "cloudflare" ? STREAM_SERVER : "",
  clave: w.modo === "cloudflare" ? w.clave : "",
  youtube: w.youtube,
  landing: landingUrl(w.slug),
});

const stored = (slug: string) => db().webinarsNuevos.find((w) => w.slug === slug);

/* Webinar visible al público: el próximo, o uno nuevo publicado. */
const publicWebinar = (slug: string): WebinarSummary => {
  if (slug === NEXT_SLUG) return nextSummary();
  const w = stored(slug);
  if (!w || !w.publicado) throw notFound("Webinar no encontrado");
  return toSummary(w);
};

export const nextWebinar = async () => db().webinar;

export const listWebinars = async (): Promise<WebinarSummary[]> => [
  nextSummary(),
  ...db()
    .webinarsNuevos.filter((w) => w.publicado)
    .map(toSummary),
];

export const getWebinar = async (slug: string): Promise<WebinarSummary> => publicWebinar(slug);

const statusOf = (u: string, slug: string, puntos = 0): MyWebinarStatus => {
  const s = db();
  const cert = certificateFor(u, slug);
  const w = stored(slug);
  return {
    slug,
    registrado: s.registros.some((r) => r.u === u && r.slug === slug),
    asistio: s.asistencias.some((r) => r.u === u && r.slug === slug),
    youtube: w?.modo === "youtube" ? w.youtube : null,
    puntos,
    constancia: cert ? summary(cert) : null,
  };
};

export const myWebinar = async (u: string, slug: string): Promise<MyWebinarStatus> => {
  publicWebinar(slug);
  return statusOf(u, slug);
};

export const register = async (u: string, slug: string): Promise<MyWebinarStatus> => {
  publicWebinar(slug);
  if (!db().registros.some((r) => r.u === u && r.slug === slug)) db().registros.push({ u, slug });
  return statusOf(u, slug);
};

/* Asistencia: en la plataforma la reporta el reproductor al cumplir el umbral de minutos en vivo.
   En la etapa 1 no se valida la ventana de tiempo, porque el demo simula la transmisión en vivo. */
export const attend = async (u: string, slug: string): Promise<MyWebinarStatus> => {
  const w = publicWebinar(slug);
  const s = db();
  if (s.asistencias.some((r) => r.u === u && r.slug === slug)) return statusOf(u, slug);
  s.asistencias.push({ u, slug });
  if (!s.registros.some((r) => r.u === u && r.slug === slug)) s.registros.push({ u, slug });
  const puntos = awardRule(u, "webinar", `Asistencia a webinar: ${w.titulo}`);
  issueCertificate(u, "webinar", slug, `Webinar · ${w.titulo}`);
  return statusOf(u, slug, puntos);
};

/* ---------- Administración ---------- */

export const adminWebinars = async (): Promise<AdminWebinarList> => {
  const s = db();
  const count = (slug: string) => s.asistencias.filter((a) => a.slug === slug).length;
  return {
    nuevos: s.webinarsNuevos.map(toAdmin),
    historial: s.historial.map(({ nombres: _n, ...h }) =>
      h.slug === NEXT_SLUG ? { ...h, asistentes: count(NEXT_SLUG) || null, registrados: h.registrados + s.registros.filter((r) => r.slug === NEXT_SLUG).length } : h,
    ),
  };
};

export const attendees = async (slug: string): Promise<string[]> => {
  const s = db();
  /* Cada fila del historial de ejemplo tiene slug estable en los datos semilla; nunca se busca por título. */
  const h = s.historial.find((x) => x.slug === slug);
  if (!h && !stored(slug)) throw notFound("Webinar no encontrado");
  return [...s.asistencias.filter((a) => a.slug === slug).map((a) => a.u), ...(h?.nombres ?? [])];
};

export const createWebinar = async (body: WebinarCreateRequest): Promise<AdminWebinar> => {
  const s = db();
  if (new Date(`${body.fecha}T${body.hora}:00-06:00`).getTime() <= now().getTime()) throw badRequest("La fecha y la hora tienen que ser futuras");
  if (body.umbral > body.duracion) throw badRequest("Los minutos para contar asistencia van de 1 a la duración del webinar");
  if (body.slug === NEXT_SLUG) throw badRequest(`La dirección "${NEXT_SLUG}" está reservada para el próximo webinar; usa otra`);
  if (stored(body.slug) || s.historial.some((h) => h.slug === body.slug)) throw conflict("Ya existe un webinar con esa dirección; cámbiala");
  const w: StoredWebinar = {
    slug: body.slug,
    titulo: body.titulo,
    subtitulo: body.subtitulo ?? "",
    tituloEn: body.tituloEn,
    subtituloEn: body.subtituloEn ?? "",
    grado: body.grado,
    ponente: body.ponente,
    fecha: body.fecha,
    hora: body.hora,
    duracion: body.duracion,
    umbral: body.umbral,
    publicado: body.publicado,
    modo: body.modo,
    youtube: body.modo === "youtube" ? (body.youtube ?? "") : "",
    flyer: body.flyer ?? null,
    /* En la plataforma la clave la genera Cloudflare Stream. */
    clave: "demo-" + randomBytes(6).toString("hex"),
  };
  s.webinarsNuevos.unshift(w);
  return toAdmin(w);
};
