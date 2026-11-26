import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { App } from "./app/App";
import { loadEnglish } from "./i18n";
import { getSession } from "./state/session";

const mount = () =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

/* Español: se pinta de inmediato. Inglés guardado en la sesión: se espera el diccionario (chunk aparte) antes del primer
   render para no mostrar un instante en español; si falla la carga, se pinta en español y el proveedor reintenta. */
if (getSession().lang === "en") loadEnglish().then(mount, mount);
else mount();
