/* Aviso de demo, encabezado con navegación y menús desplegables, menú de usuario y menú móvil (header() del demo). */
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { DEMO_ADMIN, DEMO_USER } from "@kiron/shared";
import { Icon } from "../../components/Icon";
import { useT } from "../../i18n";
import { cx } from "../../lib/cx";
import { session, useSession } from "../../state/session";
import { GatedLink, openLogin } from "../../features/auth";
import { useMyPoints } from "../../features/panel/useMe";
import { AC_TABS, VT_TABS } from "../links";

export function DemoBar() {
  const t = useT();
  const { demoHidden, role } = useSession();
  if (demoHidden) return null;
  return (
    <div className="demo-bar">
      <div className="wrap">
        <span className="tag">DEMO</span>
        <span>
          <b>{t("Prototipo navegable · Azul Clarito.")}</b>
          <span className="hide-s">
            {" "}
            {t("Productos, cursos, webinar y representantes vienen de kironmexico.com; médicos, alumnos y puntos son de ejemplo.")}
          </span>
        </span>
        {role !== "admin" && (
          <button className="demo-adm" type="button" onClick={() => openLogin({ role: "admin", dest: "/admin" })}>
            <Icon name="shield-check" /> {t("Ver administrador")}
          </button>
        )}
        <button type="button" aria-label={t("Cerrar aviso")} onClick={() => session.hideDemo()}>
          <Icon name="x" />
        </button>
      </div>
    </div>
  );
}

/* Menú desplegable de la navegación principal. Se abre con hover, foco o flecha abajo; Escape lo cierra. */
function NavDropdown({ label, to, active, items }: { label: string; to: string; active: boolean; items: ReadonlyArray<readonly [string, string]> }) {
  const [open, setOpen] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = `dd-${to.replace(/[^a-z]/g, "")}`;
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setSuppressed(true);
      ref.current?.querySelector<HTMLElement>("a")?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setSuppressed(false);
      const links = [...(ref.current?.querySelectorAll<HTMLElement>(".dd a") ?? [])];
      const i = links.indexOf(document.activeElement as HTMLElement);
      links[Math.min(i + 1, links.length - 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const links = [...(ref.current?.querySelectorAll<HTMLElement>(".dd a") ?? [])];
      const i = links.indexOf(document.activeElement as HTMLElement);
      if (i > 0) links[i - 1]?.focus();
      else ref.current?.querySelector<HTMLElement>("a")?.focus();
    }
  };
  return (
    <div
      ref={ref}
      className={cx("nav-dd", open && "open", suppressed && "dd-closed")}
      onMouseEnter={() => {
        setOpen(true);
        setSuppressed(false);
      }}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!ref.current?.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
          setSuppressed(false);
        }
      }}
      onKeyDown={onKeyDown}
    >
      <Link to={to} className={active ? "on" : undefined} aria-haspopup="true" aria-expanded={open && !suppressed} aria-controls={id}>
        {label} <Icon name="chevron-down" />
      </Link>
      <div className="dd" role="menu" id={id}>
        {items.map(([href, text]) => (
          <Link key={href} role="menuitem" to={href}>
            {text}
          </Link>
        ))}
      </div>
    </div>
  );
}

function UserMenu() {
  const t = useT();
  const { role } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const admin = role === "admin";
  const points = useMyPoints();
  const who = admin ? DEMO_ADMIN : DEMO_USER;
  const close = () => setOpen(false);
  return (
    <div className={cx("umenu", open && "open")} ref={ref}>
      <button
        ref={btnRef}
        className="avatar-chip"
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="umenu-pop"
        aria-label={t("Mi cuenta")}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="avatar">{who.initials}</span>
        <Icon name="chevron-down" />
      </button>
      <div className="umenu-pop" role="menu" id="umenu-pop">
        <div className="umenu-h">
          <b>{who.name}</b>
          <small>{admin ? who.email : `${who.email} · ${t("ejemplo")}`}</small>
        </div>
        {admin ? (
          <Link role="menuitem" to="/admin" onClick={close}>
            <Icon name="shield-check" /> {t("Administrador")}
          </Link>
        ) : (
          <>
            <Link role="menuitem" to="/panel" onClick={close}>
              <Icon name="layout-dashboard" /> {t("Mi panel")}
            </Link>
            <Link role="menuitem" to="/panel/cursos" onClick={close}>
              <Icon name="graduation-cap" /> {t("Mis cursos")}
            </Link>
            <Link role="menuitem" to="/panel/constancias" onClick={close}>
              <Icon name="award" /> {t("Mis constancias")}
            </Link>
            <Link role="menuitem" to="/panel/club" onClick={close}>
              <Icon name="gift" /> {t("Club MVZ")}
              {points !== null ? ` · ${points.toLocaleString("es-MX")} pts` : ""}
            </Link>
          </>
        )}
        <button
          role="menuitem"
          type="button"
          onClick={() => {
            close();
            session.logout();
          }}
        >
          <Icon name="log-out" /> {t("Cerrar sesión")}
        </button>
      </div>
    </div>
  );
}

function MLink({ to, sub, onClose, children }: { to: string; sub?: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <Link to={to} className={sub ? "sub" : undefined} onClick={onClose}>
      {children}
    </Link>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { role, lang } = useSession();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  const login = (signup: boolean) => {
    onClose();
    openLogin({ role: "mvz", stay: true, signup });
  };
  return (
    <div className={cx("mnav", open && "open")} id="mnav" ref={ref} role="dialog" aria-modal="true" aria-label={t("Menú")} hidden={!open}>
      <button className="icon-btn" type="button" style={{ alignSelf: "flex-end" }} aria-label={t("Cerrar")} onClick={onClose}>
        <Icon name="x" />
      </button>
      <MLink onClose={onClose} to="/">{t("Inicio")}</MLink>
      <MLink onClose={onClose} to="/productos">{t("Productos")}</MLink>
      <MLink onClose={onClose} to="/academia">{t("Academia")}</MLink>
      {AC_TABS.map(([tab, label]) => (
        <MLink onClose={onClose} key={tab} to={`/academia?tab=${tab}`} sub>
          {t(label)}
        </MLink>
      ))}
      <GatedLink role="mvz" to="/panel" onClick={onClose}>
        {t("Mi panel")}
      </GatedLink>
      <MLink onClose={onClose} to="/representantes">{t("Representantes")}</MLink>
      <MLink onClose={onClose} to="/distribuidores/mexico">{t("Distribuidores México")}</MLink>
      <MLink onClose={onClose} to="/distribuidores/mundo">{t("Distribuidores Mundo")}</MLink>
      <MLink onClose={onClose} to="/videoteca">{t("Videoteca")}</MLink>
      {VT_TABS.slice(1).map(([tab, label, href]) => (
        <MLink onClose={onClose} key={tab} to={href} sub>
          {t(label)}
        </MLink>
      ))}
      <GatedLink role="admin" to="/admin" onClick={onClose}>
        {t("Administrador")}
      </GatedLink>
      {role ? (
        <button
          className="btn btn-ghost"
          type="button"
          style={{ marginTop: 18 }}
          onClick={() => {
            onClose();
            session.logout();
          }}
        >
          <Icon name="log-out" /> {t("Cerrar sesión")}
        </button>
      ) : (
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="btn btn-ghost" type="button" style={{ flex: 1 }} onClick={() => login(false)}>
            {t("Iniciar sesión")}
          </button>
          <button className="btn btn-accent" type="button" style={{ flex: 1 }} onClick={() => login(true)}>
            {t("Registrarse")}
          </button>
        </div>
      )}
      <button className="btn btn-ghost" type="button" style={{ marginTop: 10 }} onClick={() => session.toggleLang()}>
        <Icon name="globe" /> {lang === "es" ? "English" : "Español"}
      </button>
    </div>
  );
}

export function Header() {
  const t = useT();
  const { pathname } = useLocation();
  const { role, lang } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [mnav, setMnav] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Al navegar se cierra el menú móvil. */
  useEffect(() => setMnav(false), [pathname]);

  const on = (prefix: string) => pathname.startsWith(prefix);
  const closeMnav = () => {
    setMnav(false);
    burgerRef.current?.focus();
  };

  return (
    <>
      <DemoBar />
      <header className={cx("hdr", scrolled && "scrolled")} id="hdr">
        <div className="wrap">
          <Link className="brand" to="/" aria-label={t("Kirón, inicio")}>
            <img src="/img/kiron-logo.png" alt={t("Kirón · Cuidando la salud de tu mejor amigo")} width={86} height={50} />
          </Link>
          <nav className="nav" aria-label={t("Principal")}>
            <Link to="/productos" className={on("/producto") ? "on" : undefined}>
              {t("Productos")}
            </Link>
            <NavDropdown label={t("Academia")} to="/academia" active={on("/academia")} items={AC_TABS.map(([tab, label]) => [`/academia?tab=${tab}`, t(label)] as const)} />
            <Link to="/representantes" className={on("/representantes") ? "on" : undefined}>
              {t("Representantes")}
            </Link>
            <NavDropdown
              label={t("Distribuidores")}
              to="/distribuidores/mexico"
              active={on("/distribuidores")}
              items={[
                ["/distribuidores/mexico", t("Distribuidores México")],
                ["/distribuidores/mundo", t("Distribuidores Mundo")],
              ]}
            />
            <NavDropdown
              label={t("Videoteca")}
              to="/videoteca"
              active={on("/videoteca") || on("/recetas")}
              items={VT_TABS.map(([, label, href]) => [href, t(label)] as const)}
            />
          </nav>
          <div className="hdr-actions">
            <button className="lang" type="button" onClick={() => session.toggleLang()} aria-label={t("Cambiar idioma")}>
              <b className={lang === "es" ? "cur" : undefined}>ES</b> · <b className={lang === "en" ? "cur" : undefined}>EN</b>
            </button>
            <Link className="icon-btn" to="/productos?focus=1" aria-label={t("Buscar")}>
              <Icon name="search" />
            </Link>
            {role === "mvz" && (
              <Link className="btn btn-primary btn-sm" to="/panel">
                <Icon name="graduation-cap" /> {t("Mi panel")}
              </Link>
            )}
            {role === "admin" && (
              <Link className="btn btn-primary btn-sm" to="/admin">
                <Icon name="shield-check" /> {t("Administrador")}
              </Link>
            )}
            {role ? (
              <UserMenu />
            ) : (
              <>
                <button className="btn btn-ghost btn-sm hdr-auth" type="button" onClick={() => openLogin({ role: "mvz", stay: true })}>
                  <Icon name="user" /> {t("Iniciar sesión")}
                </button>
                <button className="btn btn-accent btn-sm hdr-auth" type="button" onClick={() => openLogin({ role: "mvz", stay: true, signup: true })}>
                  {t("Registrarse")}
                </button>
                <button className="icon-btn hdr-auth-m" type="button" aria-label={t("Iniciar sesión")} onClick={() => openLogin({ role: "mvz", stay: true })}>
                  <Icon name="user" />
                </button>
              </>
            )}
            <button
              ref={burgerRef}
              className="icon-btn burger"
              type="button"
              aria-label={t("Menú")}
              aria-expanded={mnav}
              aria-controls="mnav"
              onClick={() => setMnav(true)}
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>
      <MobileNav open={mnav} onClose={closeMnav} />
    </>
  );
}
