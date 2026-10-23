# ShadowApp — Roadmap del proyecto

## Propósito

Este documento es la fuente de verdad para organizar, priorizar y dar seguimiento al desarrollo de ShadowApp. Debe actualizarse al completar tareas, descubrir dependencias, cambiar decisiones o aplazar trabajo.

## Reglas de mantenimiento

1. Leer este documento y `AGENTS.md` antes de iniciar una nueva fase.
2. Revisar la documentación técnica existente antes de crear documentos nuevos.
3. Auditar el flujo de datos afectado antes de modificar código.
4. No marcar tareas como completadas sin verificar implementación y pruebas.
5. Actualizar este roadmap al terminar cada tarea relevante.
6. Registrar los archivos modificados, las pruebas ejecutadas y los problemas pendientes en el informe de implementación.
7. No duplicar especificaciones técnicas aquí. Mantenerlas en documentos especializados y enlazarlos.
8. No cambiar arquitecturas, contratos API o reglas de negocio fuera del alcance de la tarea sin autorización.
9. Mantener las etiquetas y los textos de la interfaz en español, siguiendo las convenciones existentes del proyecto.
10. Preservar las decisiones ya establecidas y evitar mecanismos paralelos o sistemas heredados cuando exista una fuente canónica.

## Estados

- [ ] Pendiente.
- [ ] Completado y verificado.
- [ ] En progreso: indicar explícitamente en el texto.
- [ ] Bloqueado: indicar el motivo y la dependencia.
- Por verificar: existe información previa, pero falta confirmación en el estado actual del repositorio.

No considerar una tarea completada únicamente porque el código fue escrito. Verificar su integración, sus pruebas y los flujos afectados.

## Fase 0 — Auditoría y estabilidad

**Objetivo:** conservar la integridad de la aplicación y establecer una base verificable.

- [ ] Verificar las instrucciones de `AGENTS.md` y la documentación de arquitectura.
- [ ] Identificar las fuentes canónicas de datos y las reglas mecánicas.
- [ ] Verificar los comandos disponibles para pruebas, lint y build.
- [ ] Identificar deuda técnica y errores que bloqueen las siguientes fases.

## Fase 1 — Catálogo y formularios administrativos

**Objetivo:** separar la información descriptiva de la configuración mecánica y mantener coherentes las operaciones administrativas.

- [ ] Verificar el estado del rediseño de formularios de armas.
- [ ] Verificar el estado del rediseño de rasgos y debilidades.
- [x] Completar el rediseño del formulario de municiones.
- [ ] Revisar los formularios de los demás tipos de objetos del catálogo.
- [ ] Verificar la separación entre información básica y efectos mecánicos.
- [ ] Verificar la consistencia entre catálogo, reglas del sistema, tienda e inventario.
- [ ] Comprobar los estados de publicación y disponibilidad de los objetos.

Especificación de municiones: `docs/implementation/ammunition.md`.

*Certificación de Municiones (16 de octubre de 2026):*
- Pruebas ejecutadas: 77/77 pasadas (`ammunition.test.ts`, `ammunitionIntegration.test.ts`, `weaponValidation.test.ts`, `weaponPhase5Certification.test.ts`, `weaponSecondaryDamage.test.ts`, `weaponApiIntegration.test.ts`).
- Verificaciones: Consumo individual de 1 bala por disparo, persistencia atómica en `selectedChoices.remainingBullets`, bono de daño de munición aplicado una única vez sin modificar la caja global del catálogo, API `/api/characters/:id/possessions/:elementId/consume-ammo`, e integración de existencias ("25/30 balas") en el editor e inventarios de todas las facciones.
- Sin defectos ni regresiones detectados.

## Fase 2 — Inventario y economía de objetos

**Objetivo:** garantizar que las existencias, propiedades y operaciones de los objetos sean coherentes en toda la aplicación.

- [ ] Auditar el modelo de inventario y las relaciones con los personajes.
- [ ] Verificar la compra, asignación, consumo y eliminación de objetos.
- [x] Implementar o verificar el consumo individual de municiones.
- [x] Mostrar las existencias restantes en los perfiles correspondientes.
- [x] Verificar la compatibilidad entre armas y municiones.
- [x] Comprobar la integridad de los datos mediante API y persistencia.

## Fase 3 — Motor de reglas y efectos mecánicos

**Objetivo:** mantener un sistema mecánico centralizado, validado y reutilizable.

- [ ] Verificar que MechanicalBehavior sea la fuente canónica de los efectos.
- [ ] Auditar costes, categorías, disponibilidad y validaciones de reglas.
- [ ] Verificar la composición de costes estructurales de técnicas.
- [x] Contrato canónico de objetivos — Fase 1: Tipado, esquema Zod, normalización y etiquetas de `MechanicalTarget` (`docs/mechanical-effects-contract.md`).
- [x] Contrato canónico de objetivos — Fase 2: Coherencia de runtime (`resolveTargetCandidates`, `executeMultiTargetBehavior`, descripciones neutrales y atomicidad) (`docs/mechanical-runtime-architecture.md`).
- [ ] Revisar efectos de armas, rasgos, debilidades y técnicas.
- [ ] Validar daño, daño secundario, curación, barreras y temporalidad.
- [ ] Añadir pruebas de regresión para los comportamientos modificados.

*Riesgo pendiente de diseño (Objetivos y Costes CE):* La conservación física de las reglas históricas `ally_N` y `enemy_N` en el catálogo no garantiza que todas las técnicas normalizadas a `character` mantengan su coste efectivo previo. Requiere una auditoría específica de técnicas afectadas antes de alterar reglas o tarifas.

## Fase 4 — Combate

**Objetivo:** integrar las reglas de combate con los datos reales de personajes, armas, municiones y técnicas.

- [ ] Revisar la preparación del combate y sus pendientes documentados.
- [ ] Verificar iniciativa, resolución de acciones y selección de objetivos.
- [ ] Integrar el consumo de recursos y municiones con el flujo de combate.
- [ ] Verificar daño, defensa, evasión, estados y efectos secundarios.
- [ ] Validar los resultados mediante pruebas automatizadas.

## Fase 5 — Personajes y perfiles públicos

**Objetivo:** garantizar que las fichas y los registros presenten los datos correctos sin exponer detalles internos.

- [ ] Verificar CharacterSheetViewModel y sus fuentes de datos.
- [ ] Revisar atributos, estadísticas derivadas, rasgos y debilidades.
- [ ] Verificar inventario, armas y existencias de municiones.
- [ ] Comprobar los diseños por grupo de personaje.
- [ ] Verificar credenciales, registros y datos públicos.
- [ ] Evitar mostrar identificadores internos o enums técnicos en la interfaz.

## Fase 6 — Tienda, registros y administración

**Objetivo:** completar los flujos administrativos y económicos integrados con el sistema de reglas.

- [ ] Verificar costes compartidos entre reglas, catálogo y tienda.
- [ ] Revisar compras, precios, monedas y experiencia.
- [ ] Verificar empleos, clases, registros y personajes canon.
- [ ] Revisar permisos y roles administrativos.
- [ ] Validar las operaciones contra la base de datos.

## Fase 7 — Calidad, seguridad y despliegue

**Objetivo:** asegurar que las funcionalidades verificadas funcionen en producción.

- [ ] Ejecutar pruebas relevantes, lint y build.
- [ ] Revisar migraciones y compatibilidad de base de datos.
- [ ] Verificar variables de entorno y configuración de producción.
- [ ] Revisar autorización, validación de API y manejo de errores.
- [ ] Verificar despliegue y operaciones críticas en el entorno de producción.
- [ ] Documentar problemas conocidos y procedimientos de recuperación.

## Registro de sesiones

Añadir una entrada al finalizar cada fase o tarea relevante.

### Plantilla

- **Fecha:**
- **Fase / tarea:**
- **Estado anterior y nuevo:**
- **Archivos modificados:**
- **Pruebas ejecutadas y resultados:**
- **Decisiones tomadas:**
- **Problemas pendientes:**
- **Siguiente paso recomendado:**

### Sesión 22 de octubre de 2026 — Cierre de Fase 2: Coherencia del runtime de objetivos

- **Fecha:** 22 de octubre de 2026
- **Fase / tarea:** Fase 2 — Coherencia del runtime de objetivos (`MechanicalTarget` runtime consistency).
- **Estado anterior y nuevo:**
  - *Estado anterior:* Fase 1 completada con anticipación parcial de Fase 2 en runtime (detección de filtrado espurio de facción `rel !== "ally"` en `executeMultiTargetBehavior`, ausencia de filtro en `resolveTargetCandidates` y descripciones que inferían «aliados»).
  - *Estado nuevo:* Completado y verificado. Runtime alineado con el contrato canónico: `character` neutral de facción, `excludeSelf` aplicado coherentemente en selección automática y explícita, descripciones neutrales `(excluyendo al usuario)`, validación atómica y preservación de restricciones de facción para tipos históricos no normalizados.
- **Archivos modificados:**
  - `src/domain/mechanicalRuntime.ts` (filtrado previo en `resolveTargetCandidates`, eliminación de `rel !== "ally"` y razón canónica en `executeMultiTargetBehavior`).
  - `src/domain/mechanicalDescription.ts` (renderizado neutral `(excluyendo al usuario)` para `character` con `excludeSelf: true`).
  - `src/domain/__tests__/mechanicalDescription.test.ts` (actualización de Test J a descripción neutral).
  - `src/domain/__tests__/multiTargetBehavior.test.ts` (actualización de Escenarios E y F; adición de prueba de compatibilidad histórica para `ally`).
  - `src/domain/__tests__/targetContractPhase2.test.ts` (suite de regresión exhaustiva con los 12 puntos de verificación).
  - `docs/mechanical-effects-contract.md` (actualización de dimensiones y especificación canónica de `MechanicalTarget`).
  - `docs/mechanical-runtime-architecture.md` (adición de Sección 9 detallando pipeline de selección, ejecución, descripciones y costes).
  - `docs/ROADMAP.md` (registro de hitos y sesión de cierre).
- **Pruebas ejecutadas y resultados:**
  - 1.047 pruebas aprobadas en 110 archivos de prueba ejecutados en la suite global del proyecto (100% éxito, sin regresiones).
  - 79 pruebas aprobadas en las 4 suites especializadas de objetivos (`targetContractPhase1.test.ts`, `targetContractPhase2.test.ts`, `multiTargetBehavior.test.ts`, `mechanicalDescription.test.ts`).
  - Verificación estática y de políticas (lint): `tsc --noEmit && npm run check:policy` exitoso con cero errores.
  - Compilación de la aplicación: `compile_applet` / `npm run build` exitoso.
- **Decisiones tomadas:**
  - Consolidar la semántica neutral de `character`: la facción no forma parte de su contrato; admite aliados, enemigos y neutrales.
  - Establecer `excludeSelf` como el único control ortogonal para admitir o excluir al ejecutor de la acción.
  - Eliminar la inferencia de alianzas en `describeMechanicalTarget`, sustituyéndola por `(excluyendo al usuario)`.
  - Preservar los rechazos y mensajes habituales de facción exclusivamente para tipos `ally` y `enemy` que ingresen al runtime sin normalización previa.
  - Preservar físicamente las opciones históricas `ally_N` y `enemy_N` en catálogo; `character` utiliza las opciones genéricas de recuento.
- **Problemas pendientes:**
  - *Riesgo pendiente de diseño (Balance CE):* La conservación física de las reglas históricas no garantiza que todas las técnicas normalizadas mantengan su coste efectivo anterior idéntico si dependían de tarifas diferenciadas. Se documenta como una decisión pendiente de diseño que requerirá una auditoría comparativa de técnicas afectadas antes de modificar reglas o tarifas del catálogo.
- **Siguiente paso recomendado:**
  - Realizar una auditoría técnica de las técnicas existentes en catálogo que hayan sido normalizadas a `character` para cuantificar variaciones de coste efectivo en `target_count` antes de proponer cambios de balance o migración de tarifas.

## Criterio de finalización del proyecto

Una fase solo se considera completada cuando su comportamiento está integrado en el flujo real de datos, las pruebas relevantes pasan, no existen regresiones conocidas sin documentar y el roadmap refleja el estado comprobado del repositorio.
