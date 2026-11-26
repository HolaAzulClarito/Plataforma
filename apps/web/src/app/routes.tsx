/* Tabla de rutas (docs/mapa-rutas.md). Para agregar una página: créala en su feature, expórtala en el index.ts de la
   feature y regístrala aquí dentro del layout que le toque. */
import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes } from "react-router";
import { ApiStatus } from "../components/ui";
/* Inicio, catálogo y 404 van en el bundle principal; se importan de su archivo (no del index de la feature) para que
   las páginas secundarias del sitio queden fuera del chunk principal. */
import { Catalogo } from "../features/sitio/Catalogo";
import { Home } from "../features/sitio/Home";
import { NotFound } from "../features/sitio/NotFound";
import { AppLayout, PublicLayout, RequireRole } from "./layouts/Layouts";
import { LegacyRedirects } from "./redirects";

/* Páginas secundarias del sitio: bajo demanda, cada archivo en su chunk. */
const Producto = lazy(() => import("../features/sitio/Producto").then((m) => ({ default: m.Producto })));
const Distribuidores = lazy(() => import("../features/sitio/Red").then((m) => ({ default: m.Distribuidores })));
const Representantes = lazy(() => import("../features/sitio/Red").then((m) => ({ default: m.Representantes })));
const Videoteca = lazy(() => import("../features/sitio/Videoteca").then((m) => ({ default: m.Videoteca })));
const Recetas = lazy(() => import("../features/sitio/Videoteca").then((m) => ({ default: m.Recetas })));
const Farmacovigilancia = lazy(() => import("../features/sitio/Paginas").then((m) => ({ default: m.Farmacovigilancia })));
const Legal = lazy(() => import("../features/sitio/Paginas").then((m) => ({ default: m.Legal })));
/* Academia, panel y webinars se cargan bajo demanda (cada una en su chunk). */
const AcademiaPage = lazy(() => import("../features/academia/Academia").then((m) => ({ default: m.AcademiaPage })));
const CursoPage = lazy(() => import("../features/academia/Curso").then((m) => ({ default: m.CursoPage })));
const VerificarPage = lazy(() => import("../features/academia/Verificar").then((m) => ({ default: m.VerificarPage })));
const PanelPage = lazy(() => import("../features/panel/PanelPage").then((m) => ({ default: m.PanelPage })));
const WebinarPage = lazy(() => import("../features/webinars/WebinarPage").then((m) => ({ default: m.WebinarPage })));
/* Administrador: pesado y solo para el rol admin; un chunk compartido por sus tres rutas. */
const AdminPage = lazy(() => import("../features/admin").then((m) => ({ default: m.AdminPage })));
const AdminAcademiaPage = lazy(() => import("../features/admin").then((m) => ({ default: m.AdminAcademiaPage })));
const AdminEditorPage = lazy(() => import("../features/admin").then((m) => ({ default: m.AdminEditorPage })));
const lz = (el: ReactNode) => <Suspense fallback={<ApiStatus loading error={null} />}>{el}</Suspense>;

export function AppRoutes() {
  return (
    <LegacyRedirects>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="productos" element={<Catalogo />} />
          <Route path="producto/:slug" element={lz(<Producto />)} />
          <Route path="academia" element={lz(<AcademiaPage />)} />
          <Route path="academia/curso/:slug" element={lz(<CursoPage />)} />
          <Route path="verificar" element={lz(<VerificarPage />)} />
          <Route path="verificar/:folio" element={lz(<VerificarPage />)} />
          <Route path="webinar/:slug" element={lz(<WebinarPage />)} />
          <Route path="videoteca" element={lz(<Videoteca />)} />
          <Route path="recetas-cuantificadas" element={lz(<Recetas />)} />
          <Route path="distribuidores/:region" element={lz(<Distribuidores />)} />
          <Route path="representantes" element={lz(<Representantes />)} />
          <Route path="farmacovigilancia" element={lz(<Farmacovigilancia />)} />
          <Route path="legal" element={lz(<Legal />)} />
          <Route path="legal/:doc" element={lz(<Legal />)} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route
            path="panel/*"
            element={
              <RequireRole role="mvz">
                {lz(<PanelPage />)}
              </RequireRole>
            }
          />
          <Route
            path="admin/academia/editor/:ci/:mi/:li"
            element={
              <RequireRole role="admin">
                {lz(<AdminEditorPage />)}
              </RequireRole>
            }
          />
          <Route
            path="admin/academia/:tab"
            element={
              <RequireRole role="admin">
                {lz(<AdminAcademiaPage />)}
              </RequireRole>
            }
          />
          <Route
            path="admin/*"
            element={
              <RequireRole role="admin">
                {lz(<AdminPage />)}
              </RequireRole>
            }
          />
        </Route>
      </Routes>
    </LegacyRedirects>
  );
}
