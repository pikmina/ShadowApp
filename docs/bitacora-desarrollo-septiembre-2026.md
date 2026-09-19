# Bitácora de Desarrollo — Septiembre 2026 (10 al 19 de septiembre)

Este documento registra los cambios arquitectónicos, modelos de datos, endpoints de backend, componentes de interfaz y pruebas automatizadas implementadas en ShadowApp durante el período del 10 al 19 de septiembre de 2026. Sirve como referencia técnica del estado actual del sistema y del cumplimiento de los contratos de diseño.

---

## 1. Resumen de Hitos por Jornada

### 10 al 13 de Septiembre de 2026 — Reglas Fundacionales, Estadísticas y Estados Alterados
- **Estadísticas Derivadas (`system_derived`)** *(11 de sept.)*:
  - Definición en `system_rules` de las fórmulas maestras para la derivación de estadísticas secundarias de personajes.
- **Estados Alterados y Títulos de Técnicas** *(12 y 13 de sept.)*:
  - Creación de los primeros estados alterados canónicos en `system_elements`: *Hemorragia Grave* (`Z0flDdKfJN`) y *Aturdido* (`core.status.stunned`).
  - Definición de los primeros elementos de habilitación de técnicas (`technique_entitlement`).
- **Costes de Estamina por Contexto (`stamina_execution_costs`)** *(13 de sept.)*:
  - Establecimiento del estándar canónico de **CE** (*Coste de Estamina*) para acciones básicas, activación de técnicas y uso de objetos en combate.
  - Base directa para el contrato unificado de efectos mecánicos (`docs/mechanical-effects-contract.md`).

---

### 14 de Septiembre de 2026 — Personajes Canon, Fichas de Prueba y Estructura Académica
- **Modelo de Personajes Canon (`canon_characters`)**:
  - Implementación del servicio `src/db/canonCharacters.ts` y tabla `canon_characters`.
  - Definición de ciclo de vida con estados `available`, `reserved` y `occupied`.
  - Creación de los registros canon de referencia: *Izuku* (`izuku-midoriya`) y *Toshinori / All Might* (`all_might`).
  - Creación de las primeras fichas vinculadas y de prueba en `characters` (*Momoka*, *Izuku*).
- **Publicación de Rasgos Clave**:
  - Publicación del rasgo *Estamina Mejorada* (`qkjszoZpJb`) en el catálogo general de elementos.
- **Definición de Etapas por Edad (`system_stages`)**:
  - Parametrización en `system_rules` de las franjas etarias y fases vitales para el escalado de personajes.
- **Estructura Académica Base (`academic_years` y `class_groups`)**:
  - Creación de los cursos lectivos canónicos: *Primer Año*, *Segundo Año* y *Tercer Año*.
  - Creación de las divisiones de clase iniciales (*Clase A*, *Clase B*) con soporte para especialidad (`courseType`), aforo (`capacity`) y orden de visualización.

---

### 15 de Septiembre de 2026 — Matrículas de Estudiantes y Matriz Inicial Laboral
- **Sistema de Matrículas (`character_enrollments`)**:
  - Implementación del servicio `src/db/academicClasses.ts` para asignación de personajes (originales y canon) a grupos académicos.
  - Registro de la primera matrícula del sistema: personaje canon *Izuku* en *Primer Año – Clase A*.
  - Pruebas de integración académica en `src/db/__tests__/academicClasses.test.ts`.
- **Semilla del Sistema Laboral (`employment_compensation`)**:
  - Carga inicial en `system_rules` de la matriz salarial por rango y adicionales por nivel de riesgo, sentando las bases para el módulo de compensaciones e instituciones implementado al día siguiente.

---

### 16 de Septiembre de 2026 — Núcleo de Empleos y Remuneraciones
- **Modelado relacional de empleos**:
  - Creación de las tablas `departments`, `positions`, `character_employments` y `employment_payments` en PostgreSQL (`src/db/schema.ts`).
  - Definición de relaciones entre personajes, instituciones y puestos de trabajo con claves foráneas e integridad referencial en cascada.
- **Contrato de compensación (`system_rules/employment_compensation`)**:
  - Almacenamiento en `system_rules` como fuente única de verdad para la matriz salarial por nivel de puesto y adicionales por nivel de riesgo (Bajo, Medio, Alto, Extremo).
  - Lógica de cálculo puro aislada en `src/domain/employmentCompensation.ts` para garantizar que la determinación de Yenes y EXP no dependa de efectos secundarios:
    $$\text{Yenes} = \text{Base Nivel} + \text{Riesgo} + \text{Bono Puesto}$$
    $$\text{EXP} = \text{Base Nivel} + \text{Riesgo} + \text{Bono Puesto}$$
- **Procesamiento de pagos por lote (`employment_payment_batch`)**:
  - Endpoint `POST /api/employments/pay-batch` para liquidación masiva o individual de salarios.
  - Exigencia estricta de aprobación manual (`manualApprovalRequired: true`) con captura de notas de moderación (p. ej., revisión de actividad en foros).
  - Transacciones atómicas que actualizan simultáneamente el saldo de Yenes y EXP del personaje (`characters`), crean el recibo de pago inmutable (`employment_payments`) y emiten el evento de auditoría (`audit_logs`).

---

### 17 de Septiembre de 2026 — Inmutabilidad Contable y Pruebas de Integración
- **Congelamiento de desglose contable**:
  - Documentación del contrato en `docs/employment-compensation-contract.md`.
  - Garantía de que cada registro en `employment_payments` almacena la copia histórica exacta de la base, adicional de riesgo y bono aplicados en el momento de la liquidación, asegurando que ajustes futuros en `system_rules` no alteren balances históricos.
- **Suite de pruebas de empleos**:
  - Implementación de pruebas automatizadas en `src/db/__tests__/employmentCompensation.test.ts` y `src/db/__tests__/employments.test.ts`.
  - Verificación de asignación de empleos, rescisión, pagos múltiples, control de duplicados y validación de rangos numéricos no negativos.

---

### 18 de Septiembre de 2026 — Posesiones de Personajes e Inventario Atómico
- **Tabla relacional `element_possessions`**:
  - Creación de la tabla puente entre `characters` y `system_elements`.
  - Definición de índice único compuesto en `(character_id, element_id)` para prevenir inconsistencias de inventario duplicado.
  - Columnas para `quantity`, `category` (inventario general, credenciales, licencias, equipamiento), `notes` y `acquired_at`.
- **Sincronización atómica de elementos (`character_elements_sync`)**:
  - Endpoints transaccionales para sincronizar el catálogo de posesiones de una ficha sin riesgo de sobrescritura parcial en caso de fallos de red.
  - Registro de auditoría `possession_update` detallando la cantidad previa, cantidad final y motivo del cambio.
- **Pruebas de ciclo de vida con personajes**:
  - `src/db/__tests__/elementLifecycleWithCharacter.test.ts` y `src/db/__tests__/characters.test.ts`.
  - Verificación del comportamiento ante eliminación en cascada, actualización concurrente mediante control de versiones (`updatedAt`) y preservación de campos no modificados durante `UPDATE`.

---

### 19 de Septiembre de 2026 — Verificación de Elementos, Auditoría, Dashboard y Perfiles

#### A. Verificación del Ciclo de Vida de Elementos del Sistema
- **Protocolo de verificación desechable** (según directrices de `AGENTS.md`):
  - Ejecución del ciclo canónico: `CREATE -> SAVE -> LOAD & COMPARE -> EDIT -> SAVE AGAIN -> RELOAD & COMPARE -> DELETE -> CONFIRM DELETION`.
  - Prueba ejecutada con elementos transitorios (`TEMP Combate Marcial`, `TEMP Combate Marcial (Maestría)`), confirmando que las operaciones respetan las transacciones y limpian los registros de prueba sin dejar residuos.

#### B. Registro de Auditoría Unificado (`audit_logs`)
- **Estructura y persistencia**:
  - Almacenamiento en tabla `audit_logs` con `actor_uid`, `action_type`, `target_id`, `details` (JSONB) y `created_at`.
  - Registro de eventos clave: creación/edición/borrado de elementos, actualización de reglas globales, sincronización de inventario, pagos de nómina y cambios de perfil.
- **Consultas optimizadas y resolución de identidades**:
  - Módulo `src/db/auditLogs.ts` con cruce relacional hacia `users` para resolver email y rol operativo del actor.
  - Soporte para filtros por término de búsqueda, tipo de acción y rango temporal.
  - Pruebas en `src/db/__tests__/auditLogs.test.ts`.

#### C. Dashboard Administrativo y Métricas en Tiempo Real
- **Métricas del sistema**:
  - Implementación de consultas agregadas en `src/db/dashboard.ts` y visualización en `src/views/AdminDashboard.tsx`.
  - Contadores de personajes activos, elementos en catálogo, usuarios registrados y actividad reciente.
  - Botón de refresco interactivo integrado en `SectionHeader` con estado de carga para consultar datos en caliente sin recargar la página.
  - Pruebas en `src/db/__tests__/dashboard.test.ts`.

#### D. Personalización y Gestión de Perfil de Usuario
- **Evolución del modelo de usuario**:
  - Incorporación de las columnas `display_name` (texto), `avatar_url` (texto) y `updated_at` (timestamp) en la tabla `users` de Cloud SQL PostgreSQL.
  - Función `updateUserProfile(uid, { displayName, avatarUrl })` en `src/db/users.ts`.
- **Endpoint de backend `PATCH /api/auth/profile`**:
  - Validación del token de Firebase mediante el middleware `requireAuth`.
  - Actualización atómica en la tabla `users` de PostgreSQL.
  - Sincronización simultánea en Firebase Auth (`updateUser({ displayName, photoURL })`) para mantener coherencia entre autenticación y base de datos relacional.
  - Emisión de registro de auditoría (`user_profile_updated`).
- **Contexto de Autenticación (`AuthContext.tsx`)**:
  - Actualización del tipo `DbUser` con `displayName` y `avatarUrl`.
  - Exposición del método `updateProfileData()` que invoca la API y actualiza de inmediato el estado del cliente en React.
- **Componentes de Interfaz de Usuario**:
  - `src/components/profile/UserProfileDialog.tsx`: modal interactivo que permite ingresar URL directa, subir imágenes desde el equipo (validación de tipo MIME y tamaño $\le 2\text{ MB}$ con vista previa) o elegir entre presets temáticos cyberpunk; incluye validación de longitud de nombre (2 a 40 caracteres).
  - `src/components/DashboardLayout.tsx`: trigger de edición accesible desde el pie de la barra lateral (junto al avatar y correo) y desde la cabecera superior, con fallback tipográfico elegante (`Oxanium`).
  - `src/views/SettingsAdmin.tsx`: nueva pestaña «Mi Perfil» en la vista de Ajustes Globales para administración persistente.
- **Resolución de migraciones y esquema**:
  - Corrección de índices únicos en `src/db/schema.ts` (`element_possessions_character_id_element_id_unique` y `character_sheet_fields_core_key_unique`) para permitir migraciones no interactivas en entornos CI/CD y Cloud Run sin requerir TTY.
  - Corrección del error de runtime `column "display_name" does not exist` y restablecimiento total de la verificación de tokens e inicio de sesión.

---

## 2. Mapa de Archivos Clave Afectados

| Capa | Archivos Principales | Propósito |
| :--- | :--- | :--- |
| **Base de Datos** | `src/db/schema.ts`<br>`src/db/migrate.ts`<br>`src/db/users.ts`<br>`src/db/canonCharacters.ts`<br>`src/db/academicClasses.ts`<br>`src/db/dashboard.ts`<br>`src/db/auditLogs.ts` | Esquema Drizzle, tablas relacionales, gestión de canon y academia, usuarios, métricas y auditoría. |
| **Dominio** | `src/domain/employmentCompensation.ts`<br>`src/domain/systemMechanics.ts`<br>`src/domain/mechanics.ts` | Cálculos puros de salarios, reglas canónicas de efectos mecánicos y cálculo de Coste de Estamina (CE). |
| **Backend / API** | `server.ts`<br>`src/middleware/auth.ts` | Endpoints REST (`/api/auth/profile`, `/api/employments/*`, `/api/audit-logs`, `/api/dashboard/stats`, etc.), verificación de roles y JWT. |
| **Contexto y Estado** | `src/contexts/AuthContext.tsx` | Estado de autenticación global, hidratación de usuario y método `updateProfileData`. |
| **Interfaz (UI)** | `src/components/profile/UserProfileDialog.tsx`<br>`src/components/DashboardLayout.tsx`<br>`src/views/SettingsAdmin.tsx`<br>`src/views/AdminDashboard.tsx` | Diálogo de edición de perfil, avatar en navegación/sidebar, pestaña en ajustes y métricas del dashboard. |
| **Documentación** | `docs/employment-compensation-contract.md`<br>`docs/mechanical-effects-contract.md`<br>`docs/system-core-architecture-plan.md`<br>`docs/bitacora-desarrollo-septiembre-2026.md` | Contratos de diseño, planes de arquitectura y bitácora de cambios. |
| **Pruebas** | `src/db/__tests__/*.test.ts` (12 suites) | Verificación de compensación, auditoría, personajes, empleos, elementos y dashboard. |

---

## 3. Principios y Contratos Cumplidos

1. **Separación de Ciclos de Vida (CREATE / LOAD / UPDATE / RESET)**:
   - Las operaciones de carga e hidratación nunca sobrescriben valores existentes con valores predeterminados.
   - El envío parcial de datos en `UPDATE` preserva los campos persistidos preexistentes.
2. **Identidad Estable por IDs**:
   - Las relaciones entre entidades (empleos, elementos, personajes, categorías) emplean IDs estables y no nombres legibles ni etiquetas de presentación.
3. **Persistencia Atómica**:
   - Acciones complejas (como liquidación de nóminas o sincronización de inventario) se ejecutan dentro de transacciones PostgreSQL para evitar estados intermedios o desincronizados.
4. **Protección de Datos Históricos**:
   - Los registros de pago y auditoría guardan instantáneas inmutables de los valores monetarios y de EXP aplicados en su fecha de ejecución.
5. **Alineación con el Sistema Visual de Shadowmore**:
   - Empleo de los tokens semánticos de tema (`font-oxanium`, `primary`, `card`, `border`, etc.) y componentes de `src/components/ui` sin recurrir a bibliotecas externas discordantes o estilos en línea.

---

## 4. Estado de Validación y Pruebas

- **Análisis estático (`lint`)**: Aprobado sin errores (`tsc --noEmit`).
- **Compilación de producción (`build`)**: Compilación exitosa de frontend (Vite) y servidor CommonJS empaquetado (`dist/server.cjs`).
- **Salud de la API**: Endpoint `/api/health` respondiendo con estado HTTP 200 OK.
- **Base de datos**: Esquema de Cloud SQL PostgreSQL completamente sincronizado con las entidades declaradas en Drizzle ORM.
