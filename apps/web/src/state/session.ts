/* Sesión de interfaz del demo: idioma, aviso de demo y rol simulado.
   Se guarda en sessionStorage (como el demo: se conserva al recargar dentro de la misma pestaña).
   No es autenticación real (ADR-003): el rol viaja a la API en el encabezado DEMO_ROLE_HEADER. */
import type { Lang, Role } from "@kiron/shared";
import { createStore, useStore } from "./createStore";
import { toast } from "./toasts";

export interface SessionState {
  lang: Lang;
  demoHidden: boolean;
  role: Role | null;
}

/* Clave versionada: si cambia la forma del estado, sube la versión para no leer datos viejos. */
export const SESSION_KEY = "kiron-web-v25";
export const DEFAULT_SESSION: SessionState = { lang: "es", demoHidden: false, role: null };

function read(): SessionState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return DEFAULT_SESSION;
    const v = JSON.parse(raw) as Partial<SessionState>;
    return {
      lang: v.lang === "en" ? "en" : "es",
      demoHidden: v.demoHidden === true,
      role: v.role === "mvz" || v.role === "admin" ? v.role : null,
    };
  } catch {
    return DEFAULT_SESSION;
  }
}

function persist(s: SessionState): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* Modo privado o almacenamiento bloqueado: la sesión vive solo en memoria. */
  }
}

export const sessionStore = createStore<SessionState>(read());
sessionStore.subscribe(() => persist(sessionStore.get()));

/* El router registra aquí su navigate para que las acciones puedan redirigir. */
let navigator: ((to: string) => void) | null = null;
export function setNavigator(fn: ((to: string) => void) | null): void {
  navigator = fn;
}
const go = (to: string) => navigator?.(to);
/* Navega desde fuera de un componente (acciones, stubs). No hace nada si el router aún no se montó. */
export const navigate = (to: string): void => go(to);

const patch = (p: Partial<SessionState>) => sessionStore.set((s) => ({ ...s, ...p }));

/* ¿El rol actual cubre el rol pedido? admin también puede ver lo de mvz, como en el demo (APP.gate). */
export function hasRole(current: Role | null, needed: Role): boolean {
  return needed === "mvz" ? current !== null : current === "admin";
}

export const session = {
  /* Inicia la sesión simulada y, si se indica, navega a redirect. */
  login(role: Role, redirect?: string | null): void {
    patch({ role });
    if (redirect) go(redirect);
  },
  /* Cierra la sesión y vuelve al inicio. */
  logout(): void {
    patch({ role: null });
    go("/");
    toast("Sesión cerrada");
  },
  /* "Salir" desde cualquier pantalla (encabezado, menú móvil, administrador). Primero sale de /panel o /admin y en el
     siguiente ciclo cierra la sesión: si se cierra antes, RequireRole volvería a iniciarla (ensureRole). */
  signOut(): void {
    if (!navigator) return session.logout();
    go("/");
    setTimeout(() => session.logout(), 0);
  },
  setLang(lang: Lang): void {
    patch({ lang });
  },
  toggleLang(): void {
    const lang: Lang = sessionStore.get().lang === "es" ? "en" : "es";
    patch({ lang });
    toast(lang === "en" ? "Versión en inglés" : "Versión en español");
  },
  hideDemo(): void {
    patch({ demoHidden: true });
  },
  /* Comportamiento heredado (route() del demo): entrar a /panel o /admin sin el rol inicia la sesión simulada. */
  ensureRole(role: Role): void {
    if (!hasRole(sessionStore.get().role, role)) patch({ role });
  },
  /* Solo para tests. */
  reset(): void {
    sessionStore.set(DEFAULT_SESSION);
  },
};

export const useSession = () => useStore(sessionStore);
/* Lee el estado fuera de React (cliente de API, acciones). */
export const getSession = () => sessionStore.get();
