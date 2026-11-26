/* Piezas de interfaz pequeñas con las clases del demo. Reciben texto ya traducido (children) salvo que se indique. */
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { cx } from "../lib/cx";
import { useT } from "../i18n";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "accent" | "ghost" | "light" | "outline-light";

/* Clases de botón del demo: btnClass("primary", { sm: true }) -> "btn btn-primary btn-sm".
   Úsalo también en <Link className={btnClass("ghost")}>. */
export function btnClass(variant: ButtonVariant, opts: { sm?: boolean; block?: boolean; className?: string } = {}): string {
  return cx("btn", `btn-${variant}`, opts.sm && "btn-sm", opts.block && "btn-block", opts.className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  sm?: boolean;
  block?: boolean;
  icon?: IconName;
}

export function Button({ variant = "primary", sm, block, icon, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={btnClass(variant, { sm, block, className })} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

export type BadgeTone = "new" | "soft" | "ok" | "warn" | "dark";

export function Badge({ tone = "soft", icon, children, className }: { tone?: BadgeTone; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={cx("badge", `badge-${tone}`, className)}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

/* Aviso con icono (.notice). tone="warn" usa el estilo de advertencia. */
export function Notice({ icon = "info", tone, children, className, style }: { icon?: IconName; tone?: "warn"; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cx("notice", tone, className)} style={style}>
      <Icon name={icon} />
      <span>{children}</span>
    </div>
  );
}

/* Encabezado de página interna (.phead). Los textos se pasan en español y se traducen aquí. */
export function PageHead({ eyebrow, title, lead, translateTitle = true }: { eyebrow: string; title: string; lead?: string; translateTitle?: boolean }) {
  const t = useT();
  return (
    <section className="phead">
      <div className="wrap">
        <span className="eyebrow">{t(eyebrow)}</span>
        <h1 className="h-lg" style={{ marginTop: 14 }}>
          {translateTitle ? t(title) : title}
        </h1>
        {lead ? (
          <p className="lead" style={{ marginTop: 10, maxWidth: 680 }}>
            {t(lead)}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/* Enlace externo (nueva pestaña, rel=noopener). */
export function ExtLink({ href, className, children, label }: { href: string; className?: string; children: ReactNode; label?: string }) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
      {children}
    </a>
  );
}

/* Estado de carga o error de una lectura de la API. */
export function ApiStatus({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry?: () => void }) {
  const t = useT();
  if (error)
    return (
      <div className="notice warn" role="alert">
        <Icon name="triangle-alert" />
        <span>
          {t("No pudimos cargar esta información.")} <small>({error})</small>
        </span>
        {onRetry && (
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={onRetry}>
            {t("Reintentar")}
          </button>
        )}
      </div>
    );
  if (loading)
    return (
      <p className="api-loading" role="status">
        {t("Cargando…")}
      </p>
    );
  return null;
}
