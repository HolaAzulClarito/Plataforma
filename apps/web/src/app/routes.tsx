/* Tabla de rutas (docs/mapa-rutas.md). Para agregar una página: créala en su feature, expórtala en el index.ts de la
   feature y regístrala aquí dentro del layout que le toque. */
import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes } from "react-router";
import { ApiStatus } from "../components/ui";
import {
  Catalogo,
  Distribuidores,
  Farmacovigilancia,
  Home,
  Legal,
  NotFound,
  Producto,
  Recetas,
  Representantes,
  Videoteca,
} from "../features/sitio";
import { AppLayout, PublicLayout, RequireRole } from "./layouts/Layouts";
import { LegacyRedirects } from "./redirects";

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
          <Route path="producto/:slug" element={<Producto />} />
          <Route path="academia" element={lz(<AcademiaPage />)} />
          <Route path="academia/curso/:slug" element={lz(<CursoPage />)} />
          <Route path="verificar" element={lz(<VerificarPage />)} />
          <Route path="verificar/:folio" element={lz(<VerificarPage />)} />
          <Route path="webinar/:slug" element={lz(<WebinarPage />)} />
          <Route path="videoteca" element={<Videoteca />} />
          <Route path="recetas-cuantificadas" element={<Recetas />} />
          <Route path="distribuidores/:region" element={<Distribuidores />} />
          <Route path="representantes" element={<Representantes />} />
          <Route path="farmacovigilancia" element={<Farmacovigilancia />} />
          <Route path="legal" element={<Legal />} />
          <Route path="legal/:doc" element={<Legal />} />
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
