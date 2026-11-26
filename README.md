# Plataforma Kirón

Prototipo navegable de la nueva plataforma de Laboratorios Kirón: sitio, catálogo, academia con panel del médico, webinars en vivo, Club MVZ y administrador. Desarrollado por Azul Clarito.

> Estado: migración de la v2.4.1 (JavaScript vanilla) a React + API en curso. El demo original sigue intacto en `legacy/` como referencia de paridad.

## Estructura

```
apps/
  web/        Frontend · Vite + React 19 + TypeScript + React Router 7
  api/        Backend · Node + Hono + Zod (datos semilla en memoria)
packages/
  shared/     Tipos de dominio, reglas del LMS y formatos (fechas DD/MM/AAAA, MXN)
legacy/       Demo v2.4.1 original, sin cambios
docs/
  arquitectura/   ADRs
  mapa-rutas.md   Rutas del frontend y endpoints de la API
```

## Requisitos
- Node 20 o superior (probado con Node 24) y npm 10 o superior.

## Uso

```bash
npm install          # instala todo el monorepo
npm run dev          # API en :8787 y web en :5173 (Vite reenvía /api a la API)
npm run dev:web      # solo frontend
npm run dev:api      # solo API
npm test             # tests de shared, api y web
npm run typecheck
npm run lint
npm run build
```

Para ver el demo original, abre `legacy/index.html` en el navegador.

## Variables de entorno
Copia `apps/api/.env.example` a `apps/api/.env`. No se sube ningún `.env` al repositorio.

## Reglas de negocio clave
Ver `docs/arquitectura/adr-005-reglas-lms-compartidas.md`. En resumen: un solo examen final por curso, el precio es informativo, el acceso lo da la inscripción aprobada, y la constancia exige todas las lecciones y el examen aprobado.

## Pendientes conocidos
- [FALTA DATO] Si los precios de Kirón incluyen IVA (`packages/shared/src/format.ts`, `PRICE_IVA`).
- [FALTA DATO] Hosting y costo de la API.
- Login simulado: no apto para producción (ADR-003).
