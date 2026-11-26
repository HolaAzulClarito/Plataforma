/* Iconos que agregó el editor del demo (Object.assign(ICONS, …) en app.js) y que no están en components/icons.ts.
   Son constantes del código (Lucide), no datos: por eso se insertan como HTML igual que en components/Icon. */
import { Icon, type IconName } from "../../components/Icon";
import { cx } from "../../lib/cx";

const EXTRA = {
  "arrow-up": '<path d="m5 12 7-7 7 7" /><path d="M12 19V5" />',
  "arrow-down": '<path d="M12 5v14" /><path d="m19 12-7 7-7-7" />',
  trash: '<path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />',
  "file-down": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M12 18v-6" /><path d="m9 15 3 3 3-3" />',
  "check-check": '<path d="M18 6 7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" />',
} as const;

export type AdminIconName = IconName | keyof typeof EXTRA;

export function AIcon({ name, className }: { name: AdminIconName; className?: string }) {
  if (name in EXTRA)
    return (
      <svg
        className={cx("ico", className)}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        dangerouslySetInnerHTML={{ __html: EXTRA[name as keyof typeof EXTRA] }}
      />
    );
  return <Icon name={name as IconName} className={className} />;
}
