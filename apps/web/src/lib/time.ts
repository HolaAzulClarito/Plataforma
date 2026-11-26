import { useEffect, useState } from "react";

/* Hora actual que se refresca cada `intervalMs` (por defecto 30 s, como la cuenta regresiva del demo). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export interface CountdownParts {
  days: number;
  hours: number;
  min: number;
}

/* Días, horas y minutos que faltan para `target` (0 si ya pasó). */
export function countdownParts(target: number, now: number): CountdownParts {
  const d = Math.max(0, target - now);
  return { days: Math.floor(d / 864e5), hours: Math.floor(d / 36e5) % 24, min: Math.floor(d / 6e4) % 60 };
}
