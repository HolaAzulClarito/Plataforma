# ADR-002: Backend con Node + Hono + Zod en un monorepo de npm workspaces

**Estado:** Aceptado
**Fecha:** 26/11/2026
**Decide:** Tech lead Azul Clarito (aprobado en conversación, Gate 2)

## Contexto
El demo no tiene backend: todo vive en el navegador. Se necesita una capa de API que después pueda conectarse a una base de datos real.

## Opciones consideradas
| Opción | A favor | En contra | Costo aproximado |
|---|---|---|---|
| Node + Hono + TS | Mismo lenguaje que el frontend; tipos compartidos en `packages/shared`; estándar `api-node-hono-ac` | Menos ecosistema de IA que Python | Hosting: [FALTA DATO] |
| Python + FastAPI | Mejor para IA y datos | Dos lenguajes; los tipos no se comparten | [FALTA DATO] |

## Decisión
Node LTS + Hono + Zod. Monorepo con npm workspaces (`apps/web`, `apps/api`, `packages/shared`). No se usa pnpm porque no está instalado en el equipo de desarrollo.

## Consecuencias
- Las reglas del LMS se escriben una vez en `packages/shared` y las usan web y api.
- Cada módulo de la API sigue la estructura `routes.ts`, `service.ts` y `schemas.ts`.
- Si después entra IA pesada (chatbot real), puede vivir como un servicio aparte en Python.

## Cuándo revisar esta decisión
Si el chatbot o los reportes requieren procesamiento con LLM o datos que convenga hacer en Python.
