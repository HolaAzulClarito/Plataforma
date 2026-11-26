/* Constancias: registros propios con folio. No cambian aunque cambie la plantilla o el curso deje de publicarse. */
import type { Certificate, CertificateDocument, CertificateKind, CertificateSummary, CertificateVerification } from "@kiron/shared";
import { db } from "../../store";
import { hoyMx, now } from "../../lib/clock";
import { notFound } from "../../lib/http";

export const summary = ({ u: _u, plantilla: _p, ...c }: Certificate): CertificateSummary => c;

export const certificateFor = (u: string, ref: string): Certificate | undefined => db().constancias.find((c) => c.u === u && c.ref === ref);

const nextFolio = (): string => {
  const n = db().constancias.reduce((m, c) => Math.max(m, Number(c.folio.slice(-6)) || 0), 0) + 1;
  return `KI-${now().getFullYear()}-${String(n).padStart(6, "0")}`;
};

/* Emite la constancia una sola vez por alumno y curso o webinar. Devuelve la existente si ya se emitió. */
export const issueCertificate = (u: string, tipo: CertificateKind, ref: string, titulo: string): { cert: Certificate; nueva: boolean } => {
  const prev = certificateFor(u, ref);
  if (prev) return { cert: prev, nueva: false };
  const tpl = db().plantillas.find((t) => t.estado === "published" && t.cursos.includes(ref));
  const cert: Certificate = { folio: nextFolio(), u, tipo, ref, titulo, fecha: hoyMx(), origen: tipo === "webinar" ? "webinar" : "academia", plantilla: tpl?.id ?? null };
  db().constancias.push(cert);
  if (tpl) db().copias[cert.folio] = { plantilla: structuredClone(tpl), imagen: db().imagenes[tpl.id] ?? null };
  return { cert, nueva: true };
};

export const myCertificates = async (u: string): Promise<CertificateSummary[]> =>
  db()
    .constancias.filter((c) => c.u === u)
    .map(summary);

/* "Dra. Laura Méndez" -> "L. Méndez": la verificación pública no expone el nombre completo. */
const shortName = (u: string): string => {
  const parts = u.replace(/^(MVZ|Dra?\.|M\. en C\.|Esp\.)\s+/i, "").split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]![0]}. ${parts[parts.length - 1]}`;
};

export const verifyFolio = async (folio: string): Promise<CertificateVerification> => {
  const c = db().constancias.find((x) => x.folio === folio);
  if (!c) throw notFound("No encontramos ese folio");
  return { folio: c.folio, titulo: c.titulo, tipo: c.tipo, fecha: c.fecha, titular: shortName(c.u) };
};

export const myCertificateDocument = async (u: string, folio: string): Promise<CertificateDocument> => {
  const c = db().constancias.find((x) => x.folio === folio && x.u === u);
  if (!c) throw notFound("Constancia no encontrada");
  /* Las emitidas en la academia usan la copia de su plantilla; las migradas, la plantilla vigente. */
  const copia = db().copias[c.folio];
  const plantilla = copia?.plantilla ?? (c.plantilla ? (db().plantillas.find((t) => t.id === c.plantilla) ?? null) : null);
  return {
    constancia: summary(c),
    plantilla,
    imagen: copia ? copia.imagen : plantilla ? (db().imagenes[plantilla.id] ?? null) : null,
    datos: { nombre: u.replace(/^(MVZ|Dra?\.)\s+/, ""), curso: c.titulo, fecha: c.fecha, folio: c.folio },
  };
};
