/* Raíz de la app: router, i18n, efectos de ruta, Lenis y piezas globales (modal, toast, asistente). */
import { BrowserRouter } from "react-router";
import { ModalHost } from "../components/Modal";
import { ToastHost } from "../components/Toast";
import { Chatbot } from "../features/chatbot";
import { I18nProvider, useT } from "../i18n";
import { useLenis } from "../lib/motion";
import { RouteEffects } from "./RouteEffects";
import { AppRoutes } from "./routes";

function SkipLink() {
  const t = useT();
  return (
    <a className="sr skip" href="#view">
      {t("Saltar al contenido")}
    </a>
  );
}

/* Todo lo que va dentro del router. Los tests lo montan con <MemoryRouter>. */
export function AppShell() {
  useLenis();
  return (
    <I18nProvider>
      <SkipLink />
      <RouteEffects />
      <AppRoutes />
      <ModalHost />
      <ToastHost />
      <Chatbot />
    </I18nProvider>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
