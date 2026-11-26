import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SESSION, SESSION_KEY, getSession, hasRole, session, setNavigator } from "./session";
import { toastStore } from "./toasts";

const stored = () => JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null") as unknown;

describe("store de sesión", () => {
  it("arranca en español, con el aviso de demo visible y sin rol", () => {
    expect(getSession()).toEqual(DEFAULT_SESSION);
  });

  it("guarda cada cambio en sessionStorage con la clave versionada", () => {
    session.setLang("en");
    session.hideDemo();
    expect(SESSION_KEY).toBe("kiron-web-v25");
    expect(stored()).toEqual({ lang: "en", demoHidden: true, role: null });
  });

  it("login fija el rol y navega al destino; logout limpia el rol, vuelve al inicio y avisa", () => {
    const nav = vi.fn();
    setNavigator(nav);
    session.login("mvz", "/panel/cursos");
    expect(getSession().role).toBe("mvz");
    expect(nav).toHaveBeenLastCalledWith("/panel/cursos");
    session.logout();
    expect(getSession().role).toBeNull();
    expect(nav).toHaveBeenLastCalledWith("/");
    expect(toastStore.get()?.msg).toBe("Sesión cerrada");
    setNavigator(null);
  });

  it("login sin destino no navega", () => {
    const nav = vi.fn();
    setNavigator(nav);
    session.login("admin");
    expect(nav).not.toHaveBeenCalled();
    setNavigator(null);
  });

  it("ensureRole replica el acceso del demo: /panel pide cualquier sesión y /admin pide administrador", () => {
    session.ensureRole("mvz");
    expect(getSession().role).toBe("mvz");
    session.ensureRole("mvz");
    expect(getSession().role).toBe("mvz");
    session.ensureRole("admin");
    expect(getSession().role).toBe("admin");
    session.ensureRole("mvz");
    expect(getSession().role).toBe("admin");
  });

  it("hasRole: el administrador también cubre lo de médico", () => {
    expect(hasRole(null, "mvz")).toBe(false);
    expect(hasRole("mvz", "mvz")).toBe(true);
    expect(hasRole("admin", "mvz")).toBe(true);
    expect(hasRole("mvz", "admin")).toBe(false);
  });

  it("toggleLang alterna el idioma y avisa", () => {
    session.toggleLang();
    expect(getSession().lang).toBe("en");
    expect(toastStore.get()?.msg).toBe("Versión en inglés");
    session.toggleLang();
    expect(getSession().lang).toBe("es");
  });

  it("al cargar ignora datos corruptos o con valores no válidos", async () => {
    vi.resetModules();
    sessionStorage.setItem(SESSION_KEY, "{no es json");
    const a = await import("./session");
    expect(a.getSession()).toEqual(DEFAULT_SESSION);
    vi.resetModules();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ lang: "fr", role: "root", demoHidden: "si" }));
    const b = await import("./session");
    expect(b.getSession()).toEqual(DEFAULT_SESSION);
    vi.resetModules();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ lang: "en", role: "admin", demoHidden: true }));
    const c = await import("./session");
    expect(c.getSession()).toEqual({ lang: "en", role: "admin", demoHidden: true });
  });

  it("si sessionStorage falla, la sesión sigue en memoria", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(() => session.setLang("en")).not.toThrow();
    expect(getSession().lang).toBe("en");
    spy.mockRestore();
  });
});
