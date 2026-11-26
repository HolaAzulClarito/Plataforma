# ADR-006: El curso se aprueba por nota final según la regla de cálculo

**Estado:** Propuesto
**Fecha:** 26/11/2026
**Decide:** [FALTA DATO] Account Lead de Kirón

## Contexto
El examen final tiene una regla de cálculo de la nota final (`calculo`: `mas_alta`, `promedio`, `primer_intento`, `ultimo_intento`). Hasta la v2.5.0 la API daba el curso por aprobado y emitía la constancia si **cualquier** intento estaba aprobado, sin importar esa regla. Con `primer_intento`, un alumno con intento 1 = 0.0 e intento 2 = 10 quedaba "aprobado" con nota final 0.0: la constancia y el libro de calificaciones se contradecían (hallazgo 1 del dictamen de QA del 26/11/2026).

## Opciones consideradas
| Opción | A favor | En contra | Costo aproximado |
|---|---|---|---|
| A. Aprobado = algún intento aprobado (comportamiento anterior) | Sin cambios | La regla de cálculo no sirve para aprobar; nota final y constancia se contradicen | Nulo |
| B. Aprobado = `isPassing(finalGrade(notas, calculo), aprobatoria)` | Una sola fuente de verdad; con `mas_alta` es idéntico a A | Con `primer_intento` reprobado ya no se puede aprobar; con `promedio` puede requerir varios intentos más | Bajo |
| C. Quitar las reglas distintas de `mas_alta` | Simple | Kirón pidió las cuatro reglas (paridad con Tutor LMS) | Bajo, pero pierde funcionalidad |

## Decisión (propuesta, indicada por el Delivery Lead)
Opción B.
- `examPassed(notas, calculo, aprobatoria)` en `packages/shared/src/lms.ts`: el examen final se aprueba si la nota final, con la regla del examen, alcanza la aprobatoria. Las notas son las de los intentos cerrados (calificados o vencidos en 0.0).
- La constancia, el estado del examen (`ExamStatus.aprobado`), el progreso y el libro de calificaciones usan esa misma función.
- `canStillPass(notas, calculo, aprobatoria, restantes)` decide si todavía se puede aprobar. Si no se puede, el examen queda en `"sin_intentos"` aunque queden intentos, con un motivo que nombra la regla.
- Intento adicional: solo se puede pedir si un intento más **cambiaría el resultado** (`ExamStatus.puedeSolicitar`); si no, `POST .../examen/solicitudes` responde 409. Con `primer_intento` reprobado nunca se ofrece; con `promedio` se ofrece si un intento más con 10 alcanzaría la aprobatoria.

| Regla | Intentos 0.0 y 10 | Resultado |
|---|---|---|
| `mas_alta` | nota final 10.0 | Aprobado (igual que antes) |
| `promedio` | nota final 5.0 | No aprobado |
| `primer_intento` | nota final 0.0 | No aprobado; ya no puede aprobar por nota |
| `ultimo_intento` | nota final 10.0 | Aprobado |

## Consecuencias
- Cambia el contrato: `ExamStatus.puedeSolicitar` (nuevo) y el significado de `"sin_intentos"` (también cubre "los intentos restantes ya no alcanzan").
- Con `ultimo_intento`, un alumno que aprobó y vuelve a presentar podría bajar su nota. Hoy no puede volver a presentar porque el examen aprobado se cierra (`estado: "aprobado"`), así que no ocurre.
- Cambiar la regla de cálculo de un examen con intentos recalcula el estado de esos alumnos. Las constancias ya emitidas no se revocan.
- Tests: `packages/shared/src/lms.v26.test.ts` y `apps/api/tests/aprobacion-nota-final.test.ts` cubren las cuatro reglas.

## Cuándo revisar esta decisión
- Si Kirón quiere que con `primer_intento` el alumno pueda aprobar con un intento autorizado por la administración (habría que definir qué nota cuenta).
- Si se permite volver a presentar un examen aprobado para subir la nota.
