import { useT } from "../i18n";
import { countdownParts, useNow } from "../lib/time";

const pad = (n: number) => String(n).padStart(2, "0");

/* Cuenta regresiva (.countdown) hacia `target` (ms epoch). Si la fecha ya pasó no pinta nada: quien la usa decide qué
   mostrar en su lugar (ver NextWebinar: "Webinar concluido · ver grabaciones"). `now` permite fijar la hora en tests. */
export function Countdown({ target, now: fixedNow }: { target: number; now?: number }) {
  const t = useT();
  const liveNow = useNow();
  const now = fixedNow ?? liveNow;
  if (!Number.isFinite(target) || target <= now) return null;
  const u = countdownParts(target, now);
  const items: Array<[string, number]> = [
    ["días", u.days],
    ["horas", u.hours],
    ["min", u.min],
  ];
  return (
    <div className="countdown" role="timer" aria-label={t("Cuenta regresiva")}>
      {items.map(([label, v]) => (
        <div key={label}>
          <b>{pad(v)}</b>
          <span>{t(label)}</span>
        </div>
      ))}
    </div>
  );
}
