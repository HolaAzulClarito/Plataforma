# Mapa de rutas y módulos

Fuente: `legacy/assets/js/app.js` (`route()`, línea 956). Las rutas nuevas no llevan `#`. Un enlace viejo `/#/ruta` se redirige en el cliente a `/ruta`.

## Frontend (`apps/web/src/features/`)

| Ruta nueva | Ruta legacy | Feature | Acceso |
|---|---|---|---|
| `/` | `#/` | sitio | Público |
| `/productos?cat=&q=&focus=` | `#/productos` | sitio | Público |
| `/producto/:slug` | `#/producto/:slug` | sitio | Público |
| `/academia?tab=cursos\|diplomados\|webinars&sec=` | `#/academia` | academia | Público |
| `/academia/curso/:slug` | `#/academia/curso/:slug` | academia | Público; lecciones con inscripción aprobada |
| `/verificar/:folio` | `#/verificar/:folio` | academia | Público |
| `/webinar/:slug` | `#/webinar/:slug` | webinars | Público |
| `/videoteca?tab=productos\|tutoriales` | `#/videoteca`, `#/videoteca-pets` | sitio | Videos solo con sesión |
| `/recetas-cuantificadas` | igual | sitio | Público |
| `/distribuidores/mexico`, `/distribuidores/mundo` | `#/distribuidores*`, `#/distribuidores-mexico`, `#/distribuidores-mundo` | sitio | Público |
| `/representantes` | `#/representantes`, `#/donde-comprar` | sitio | Público |
| `/farmacovigilancia` | igual | sitio | Público |
| `/legal/privacidad`, `/legal/condiciones` | igual | sitio | Público |
| `/panel`, `/panel/cursos`, `/panel/constancias`, `/panel/club` | `#/panel*`, `#/consultorio*` | panel | Rol `mvz` |
| `/admin` | `#/admin` | admin | Rol `admin` |
| `/admin/medicos`, `/admin/webinars`, `/admin/club`, `/admin/paginas` | igual | admin | Rol `admin` |
| `/admin/academia/:tab` (cursos, inscripciones, alumnos, calificaciones, intentos, examenes, constancias, automatizaciones, reportes, ajustes) | igual | admin | Rol `admin` |
| `/admin/academia/editor/:ci/:mi/:li` | igual | admin | Rol `admin` |
| `*` | 404 | sitio | Público |

Comportamiento heredado: entrar a `/panel` o `/admin` sin sesión inicia sesión simulada con ese rol (ver ADR-003).

## API (`apps/api/src/modules/`)

Prefijo `/api`. El rol de demo viaja en el encabezado `X-Demo-Role: mvz | admin`.

| Módulo | Endpoints previstos |
|---|---|
| productos | `GET /productos?cat=&q=&sort=`, `GET /productos/:slug`, `GET /categorias` |
| cursos | `GET /cursos`, `GET /cursos/:slug`, admin: `POST /cursos`, `PATCH /cursos/:slug` (estado, ajustes) |
| inscripciones | `GET /inscripciones` (admin), `GET /me/inscripciones`, `POST /inscripciones`, `PATCH /inscripciones/:id` |
| examenes | `GET /cursos/:slug/examen` (sin respuestas correctas), `POST /cursos/:slug/examen/intentos`, `GET /intentos` (admin), solicitudes de intento adicional |
| progreso | `GET /me/progreso/:slug`, `POST /me/progreso/:slug/lecciones/:i` |
| constancias | `GET /me/constancias`, `GET /constancias/:folio` (verificación pública), plantillas (admin) |
| webinars | `GET /webinars`, `GET /webinars/:slug`, `POST /webinars/:slug/registro`, `POST /webinars/:slug/asistencia`, admin: `POST /webinars` |
| club | `GET /club/reglas`, `GET /club/premios`, `GET /me/puntos`, `POST /me/canjes`, admin: reglas y premios |
| medicos | `GET /medicos/verificaciones`, `POST /medicos/verificaciones/:id/aprobar` (admin) |
| paginas | `GET /paginas`, `PUT /paginas/:id` (admin) |
| red | `GET /representantes`, `GET /distribuidores`, `GET /paises`, `GET /videos` |
