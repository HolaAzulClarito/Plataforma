# ADR-005: Reglas del LMS en packages/shared y calificación en el servidor

**Estado:** Aceptado
**Fecha:** 26/11/2026
**Decide:** Tech lead Azul Clarito (aprobado en conversación, Gate 2)

## Contexto
En el demo, el navegador califica el examen y decide si se emite la constancia. Las reglas están mezcladas con el HTML y algunos textos las contradicen (el chatbot habla de examen por módulo).

## Decisión
- Las reglas viven como funciones puras y probadas en `packages/shared/src/lms.ts`: módulos, avance, desbloqueo por fecha, intentos, calificación final y visibilidad del curso.
- La API califica el examen (`gradeAnswers`) y decide la constancia. El frontend solo muestra el resultado y nunca recibe las respuestas correctas antes de enviar.
- Reglas de negocio vigentes:
  1. Curso -> módulos -> lecciones. Los módulos solo agrupan. **Un solo examen por curso, al final.**
  2. El precio es informativo. El acceso lo da únicamente una inscripción `approved`.
  3. Constancia = todas las lecciones al 100 % **y** examen final aprobado.
  4. Intentos = los del examen (0 = sin límite) + adicionales autorizados por la administración.
  5. Aprobado = nota final según la regla de cálculo del examen alcanza la aprobatoria (propuesto en ADR-006).

### Caso válido: curso de solo examen final (`lessons: 1`)
`Course.lessons` cuenta las lecciones **más** el examen final, así que `lessons: 1` significa 0 lecciones y solo el examen final (p. ej. `simposio-parasitologia-cardiologia`). Es intencional: `lessonCount` devuelve 0, `courseModules` devuelve `[]`, el examen se abre al inscribirse y la constancia solo exige aprobarlo. No se debe "corregir" el cálculo con `Math.max(1, ...)`. Está cubierto por `lms.v26.test.ts` y por los tests de examen de la API.

## Consecuencias
- Se corrigen los textos que hablaban de examen por módulo (chatbot y examen de ejemplo).
- Cambiar una regla obliga a actualizar sus tests en `lms.test.ts`.

## Cuándo revisar esta decisión
Si Kirón pide exámenes por módulo: se cambia la regla 1 aquí, con su ADR.
