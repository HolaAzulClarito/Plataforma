/* QR de ejemplo (puerto de qrSvg del demo): patrón determinista a partir de una semilla (folio). No es un QR real
   escaneable; en producción se genera en el servidor. */
import { useMemo } from "react";
import { useT } from "../i18n";

const N = 25;

export function qrCells(seed: string): Array<[number, number]> {
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);
  const out: Array<[number, number]> = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let on: boolean;
      if (finder(x, y)) {
        const fx = x >= N - 7 ? x - (N - 7) : x;
        const fy = y >= N - 7 ? y - (N - 7) : y;
        on = fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4);
      } else {
        h = (h * 1103515245 + 12345) >>> 0;
        on = (h >>> 16) % 2 === 0;
      }
      if (on) out.push([x, y]);
    }
  return out;
}

export function QrCode({ seed, size = 120 }: { seed: string; size?: number }) {
  const t = useT();
  const cells = useMemo(() => qrCells(seed), [seed]);
  const cell = size / N;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} fill="#1d1d1b" role="img" aria-label={t("Código QR de ejemplo")}>
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell + 0.2} height={cell + 0.2} />
      ))}
    </svg>
  );
}
