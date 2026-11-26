/* Inicio de sesión simulado (APP.login / APP.doLogin / APP.gate del demo).
   - openLogin({ role, dest, stay, signup, next }) abre el modal de médico (Entrar / Crear cuenta) o el del equipo.
   - requireSession(role, next) ejecuta `next` si ya hay sesión; si no, pide iniciar sesión y lo ejecuta después.
   - <GatedLink role to> es un enlace que pide sesión antes de navegar.
   No hay autenticación real (ADR-003): los datos vienen escritos y solo cambian el rol del store. */
import { useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { DEMO_ADMIN, DEMO_USER, type Role } from "@kiron/shared";
import { Icon } from "../../components/Icon";
import { useT } from "../../i18n";
import { closeModal, openModal } from "../../state/modal";
import { getSession, hasRole, session } from "../../state/session";
import { toast } from "../../state/toasts";

export interface LoginOptions {
  role?: Role;
  /* A dónde ir al entrar. Si no se indica y stay es false, va al panel (o al administrador). */
  dest?: string | null;
  /* true = quedarse en la página actual al entrar. */
  stay?: boolean;
  /* Abrir directo en "Crear cuenta". */
  signup?: boolean;
  /* Acción pendiente que se ejecuta al iniciar sesión (equivale a window.__next del demo). */
  next?: () => void;
}

function doLogin(role: Role, dest: string | null, next?: () => void): void {
  closeModal();
  session.login(role, dest);
  if (next) setTimeout(next, 350);
  else toast(role === "admin" ? "Sesión del equipo iniciada con doble factor" : "Sesión iniciada · Dra. Laura Méndez (ejemplo)");
}

export function openLogin({ role = "mvz", dest = null, stay = false, signup = false, next }: LoginOptions = {}): void {
  if (role === "admin") {
    openModal({ title: "Administrador · acceso del equipo", size: "sm", content: <AdminLogin dest={dest ?? "/admin"} next={next} /> });
    return;
  }
  const target = stay ? null : (dest ?? "/panel");
  openModal({ title: "Tu cuenta de médico", size: "sm", content: <MvzLogin dest={target} signup={signup} next={next} /> });
}

export function requireSession(role: Role, next: () => void, opts: Omit<LoginOptions, "role" | "next"> = { stay: true }): void {
  if (hasRole(getSession().role, role)) next();
  else openLogin({ ...opts, role, next });
}

/* Enlace a una zona con sesión (panel, club, constancias, admin): si no hay rol, abre el login y luego navega. */
export function GatedLink({
  role,
  to,
  className,
  children,
  style,
  onClick: before,
}: {
  role: Role;
  to: string;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
  /* Se llama siempre al hacer clic (p. ej. para cerrar el menú móvil). */
  onClick?: () => void;
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    before?.();
    if (hasRole(getSession().role, role)) return;
    e.preventDefault();
    openLogin({ role, dest: to });
  };
  return (
    <Link to={to} className={className} onClick={onClick} style={style}>
      {children}
    </Link>
  );
}

function AdminLogin({ dest, next }: { dest: string; next?: () => void }) {
  const t = useT();
  return (
    <form
      className="modal-b"
      onSubmit={(e) => {
        e.preventDefault();
        doLogin("admin", dest, next);
      }}
    >
      <div className="demo-user">
        <Icon name="user" />
        <div>
          <b>{t("Usuario de demostración")}</b>
          <span>{DEMO_ADMIN.email} · Kiron2026</span>
          <small>{t("Ya viene escrito. Solo toca Entrar al administrador.")}</small>
        </div>
      </div>
      <div className="form-row">
        <label className="l" htmlFor="adm-mail">
          {t("Correo")}
        </label>
        <input className="input" id="adm-mail" type="email" autoComplete="username" defaultValue={DEMO_ADMIN.email} required />
      </div>
      <div className="form-row">
        <label className="l" htmlFor="adm-pass">
          {t("Contraseña")}
        </label>
        <input className="input" id="adm-pass" type="text" autoComplete="off" defaultValue="Kiron2026" required />
      </div>
      <div className="form-row">
        <label className="l" htmlFor="adm-otp">
          {t("Código de doble factor")}
        </label>
        <input className="input otp" id="adm-otp" defaultValue="482 913" inputMode="numeric" autoComplete="one-time-code" required />
        <small style={{ color: "var(--muted)", fontSize: 12.5 }}>{t("Obligatorio para el equipo. En el demo ya viene escrito.")}</small>
      </div>
      <button className="btn btn-primary btn-block" type="submit">
        <Icon name="shield-check" /> {t("Entrar al administrador")}
      </button>
    </form>
  );
}

function MvzLogin({ dest, signup, next }: { dest: string | null; signup: boolean; next?: () => void }) {
  const t = useT();
  const [tab, setTab] = useState<0 | 1>(signup ? 1 : 0);
  return (
    <div className="modal-b">
      <div className="seg" style={{ marginBottom: 18 }} role="tablist">
        <button type="button" role="tab" aria-selected={tab === 0} className={tab === 0 ? "on" : ""} onClick={() => setTab(0)}>
          {t("Entrar")}
        </button>
        <button type="button" role="tab" aria-selected={tab === 1} className={tab === 1 ? "on" : ""} onClick={() => setTab(1)}>
          {t("Crear cuenta")}
        </button>
      </div>
      <form
        hidden={tab !== 0}
        onSubmit={(e) => {
          e.preventDefault();
          doLogin("mvz", dest, next);
        }}
      >
        <div className="form-row">
          <label className="l" htmlFor="in-mail">
            {t("Correo")}
          </label>
          <input className="input" id="in-mail" type="email" autoComplete="username" defaultValue={DEMO_USER.email} required />
        </div>
        <div className="form-row">
          <label className="l" htmlFor="in-pass">
            {t("Contraseña")}
          </label>
          <input className="input" id="in-pass" type="password" autoComplete="current-password" defaultValue="demo-demo" required />
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "-6px 0 14px" }}>
          {t("Si ya tenías cuenta en el sitio actual, entra con la misma contraseña.")}
        </p>
        <button className="btn btn-primary btn-block" type="submit">
          {t("Entrar como Dra. Laura Méndez (demo)")}
        </button>
        <button className="link-team" type="button" onClick={() => openLogin({ role: "admin", dest: "/admin" })}>
          <Icon name="shield-check" /> {t("Soy del equipo Kirón: entrar al administrador")}
        </button>
      </form>
      <form
        hidden={tab !== 1}
        onSubmit={(e) => {
          e.preventDefault();
          toast("Cuenta creada. Te pediremos tu cédula para verificarla.");
          doLogin("mvz", dest, next);
        }}
      >
        <div className="grid2">
          <div className="form-row">
            <label className="l" htmlFor="up-name">
              {t("Nombre")}
            </label>
            <input className="input" id="up-name" autoComplete="name" required />
          </div>
          <div className="form-row">
            <label className="l" htmlFor="up-wa">
              {t("WhatsApp")}
            </label>
            <input className="input" id="up-wa" type="tel" autoComplete="tel" required />
          </div>
        </div>
        <div className="form-row">
          <label className="l" htmlFor="up-mail">
            {t("Correo")}
          </label>
          <input className="input" id="up-mail" type="email" autoComplete="email" required />
        </div>
        <div className="form-row">
          <label className="l" htmlFor="up-ced">
            {t("Cédula profesional")}
          </label>
          <input className="input" id="up-ced" inputMode="numeric" />
        </div>
        <div className="form-row">
          <label className="l" htmlFor="up-lvl">
            {t("Nivel académico")}
          </label>
          <select className="select" id="up-lvl">
            {["MVZ", "Estudiante MVZ", "PMVZ", "EMVZ", "Posgrado"].map((x) => (
              <option key={x} value={x}>
                {t(x)}
              </option>
            ))}
          </select>
        </div>
        <label className="check">
          <input type="checkbox" required /> {t("Acepto el")}{" "}
          <Link to="/legal/privacidad" onClick={closeModal}>
            {t("aviso de privacidad")}
          </Link>
          .
        </label>
        <button className="btn btn-accent btn-block" type="submit">
          {t("Crear cuenta")}
        </button>
      </form>
    </div>
  );
}
