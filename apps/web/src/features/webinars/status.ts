/* Reglas de fecha del próximo webinar (corrección 3). Funciones puras: se prueban sin React. */
import type { NextWebinar } from "@kiron/shared";

/* Respaldo si la API no manda startsAt (la fecha del demo v2.4.1). */
export const DEFAULT_STARTS_AT = "2026-12-15T20:00:00-06:00";
/* Duración usada para el .ics (el demo usaba 90 minutos). */
export const WEBINAR_MINUTES = 90;

export function webinarStart(w?: Pick<NextWebinar, "startsAt"> | null): number {
  const ms = Date.parse(w?.startsAt || DEFAULT_STARTS_AT);
  return Number.isFinite(ms) ? ms : Date.parse(DEFAULT_STARTS_AT);
}

/* El webinar ya empezó o terminó: no hay cuenta regresiva ni "Próximo webinar". */
export const webinarIsPast = (w: Pick<NextWebinar, "startsAt"> | null | undefined, now: number = Date.now()): boolean =>
  webinarStart(w) <= now;

const hhmm = (ms: number, timeZone: string): string =>
  new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(ms) + " Hrs";

/* Horarios por zona (la tabla .tz del demo), calculados desde startsAt en lugar de fijos. */
export function webinarTimeZones(w: Pick<NextWebinar, "startsAt">): Array<[string, string]> {
  const ms = webinarStart(w);
  return [
    [hhmm(ms, "America/Mexico_City"), "México (hora del centro), Guatemala, Honduras, Nicaragua y Costa Rica"],
    [hhmm(ms, "America/Panama"), "Panamá"],
    [hhmm(ms, "America/La_Paz"), "Bolivia"],
  ];
}

const icsDate = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/* Archivo .ics del webinar (APP.ics del demo), con la hora real de inicio. */
export function webinarIcs(w: NextWebinar, now: number = Date.now()): string {
  const start = webinarStart(w);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kirón//Demo//ES",
    "BEGIN:VEVENT",
    `UID:webinar-${(w.date || "").replace(/-/g, "")}@kironmexico.com`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(start + WEBINAR_MINUTES * 60_000)}`,
    `SUMMARY:Webinar Kirón · ${w.title}`,
    `DESCRIPTION:${w.sub}. Imparte ${w.deg} ${w.speaker}.`,
    "LOCATION:kironmexico.com · Mi panel",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Recordatorio",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
