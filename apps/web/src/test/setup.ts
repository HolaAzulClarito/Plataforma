import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";
import { clearApiCache } from "../lib/api";
import { closeModal } from "../state/modal";
import { session } from "../state/session";
import { clearMissing, loadEnglish } from "../i18n";

/* Los chunks lazy (p. ej. /admin) pueden tardar > 1000 ms en transformarse cuando Vitest corre en paralelo. */
configure({ asyncUtilTimeout: 4000 });

/* Los diccionarios en inglés se cargan bajo demanda en la app; en los tests se cargan antes para que el cambio de
   idioma sea inmediato (el estado de carga se prueba aparte en i18n/i18n-lazy.test.tsx). */
beforeAll(() => loadEnglish());

/* jsdom no implementa scrollTo ni scrollIntoView. */
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};

afterEach(() => {
  cleanup();
  closeModal();
  session.reset();
  clearApiCache();
  clearMissing();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
