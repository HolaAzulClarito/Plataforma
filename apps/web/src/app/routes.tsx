/* Tabla de rutas (docs/mapa-rutas.md). Para agregar una página: créala en su feature, expórtala en el index.ts de la
   feature y regístrala aquí dentro del layout que le toque. */
import { Route, Routes } from "react-router";
import { AcademiaPage, CursoPage, VerificarPage } from "../features/academia";
import { AdminAcademiaPage, AdminEditorPage, AdminPage } from "../features/admin";
import { PanelPage } from "../features/panel";
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
import { WebinarPage } from "../features/webinars";
import { AppLayout, PublicLayout, RequireRole } from "./layouts/Layouts";
import { LegacyRedirects } from "./redirects";

export function AppRoutes() {
  return (
    <LegacyRedirects>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="productos" element={<Catalogo />} />
          <Route path="producto/:slug" element={<Producto />} />
          <Route path="academia" element={<AcademiaPage />} />
          <Route path="academia/curso/:slug" element={<CursoPage />} />
          <Route path="verificar" element={<VerificarPage />} />
          <Route path="verificar/:folio" element={<VerificarPage />} />
          <Route path="webinar/:slug" element={<WebinarPage />} />
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
                <PanelPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/academia/editor/:ci/:mi/:li"
            element={
              <RequireRole role="admin">
                <AdminEditorPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/academia/:tab"
            element={
              <RequireRole role="admin">
                <AdminAcademiaPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/*"
            element={
              <RequireRole role="admin">
                <AdminPage />
              </RequireRole>
            }
          />
        </Route>
      </Routes>
    </LegacyRedirects>
  );
}
