import { ICONS, type IconName } from "./icons";
import { cx } from "../lib/cx";

/* Icono decorativo (aria-hidden). Si el icono comunica algo por sí solo, pon el texto en el botón o en aria-label.
   ICONS son constantes del código (no datos), por eso se insertan como HTML. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={cx("ico", className)}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

export type { IconName };
