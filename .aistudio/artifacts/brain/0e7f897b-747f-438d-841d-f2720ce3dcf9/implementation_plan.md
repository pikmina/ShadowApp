# Plan de Rediseño del Catálogo de Empleos e Instituciones

Este plan reestructura la navegación y organización del área de empleos para hacerla intuitiva, limpia y fácil de gestionar mediante un flujo de dos pantallas: **1. Catálogo General de Instituciones** y **2. Detalle Interior de Institución**.

---

## 1. Cambios en Base de Datos y Backend

1. **Esquema de Base de Datos (`src/db/schema.ts`)**:
   - Agregar campos `iconType` (`varchar`, 'lucide' | 'emoji' | null) e `iconValue` (`varchar`) a la tabla `institutions`.

2. **Backend API (`server.ts` & `src/db/employments.ts`)**:
   - Actualizar endpoints `POST /api/admin/institutions` y `PUT /api/admin/institutions/:id` para incluir `iconType` e `iconValue`.
   - Crear endpoint `POST /api/admin/institutions/:id/duplicate` o lógica en frontend para clonar una institución completa (con sus departamentos y puestos opcionalmente).

3. **Selector de Iconos (`ItemIconPicker`)**:
   - Integrar `ItemIconPicker` en el diálogo de creación/edición de instituciones (`InstitutionDialog`) para seleccionar icono Lucide o Emoji.

---

## 2. Rediseño de Vistas y UX (`EmploymentsAdmin.tsx`)

### A. Pantalla 1: Catálogo General de Instituciones
- **Mapeo en tarjetas limpias**:
  - **Icono**: Renderizado mediante `<ItemIcon iconType={inst.iconType} iconValue={inst.iconValue} />`.
  - **Nombre de Institución**.
  - **Métricas unificadas**: `X Departamentos / X Empleados / X Vacantes`.
  - **Barra de Acciones**:
    - `Ver`: Cambia el estado a la vista detallada interior de la institución.
    - `Duplicar`: Clona la institución.
    - `Editar`: Abre el modal `InstitutionDialog` (con selector de icono).
    - `Borrar`: Modal de confirmación `DeleteAction`.

### B. Pantalla 2: Interior de Institución (Vista Detallada)
- **Navegación**:
  - Botón de regreso `← Volver al Catálogo de Instituciones`.
  - Cabecera con el icono de la institución, título, descripción y botones globales.

- **Filtros Rápidos en el Interior**:
  - **Riesgo**: Todos, Ninguno, Leve, Moderado, Grave, Extremo.
  - **Área**: Todos los departamentos de la institución o uno específico.
  - **Disponibilidad**: Todos, Solo con vacantes, Ocupados al 100%.

- **Tabla Agrupada por Departamento (Expandible)**:
  - Encabezado de Departamento con botón `[+ Nuevo puesto]` directo para esa área.
  - Tabla estilizada con columnas claras:
    1. **Nombre**: Nombre del puesto + Descripción corta debajo en tipografía menor.
    2. **Nivel de Riesgo**: Leve / Moderado / Grave / Extremo con color distintivo.
    3. **Nivel de Responsabilidad**: Nivel I - VI / Por tema / Por venta, etc.
    4. **Edad / Etapa Mínima**: Requisito consolidado de edad o etapa.
    5. **Remuneración**: Yenes (¥) + Experiencia (EXP) calculados.
    6. **Vacantes**: Ocupados / Capacidad (ej. `1/2 (1 libre)`).
    7. **Acciones**:
       - `Ver / Personajes Asignados`: Abre modal con detalles del puesto, requisitos completos y lista de personajes asignados (con opción de retirar o asignar).
       - `Editar`: Abre `PositionDialog`.
       - `Duplicar`: Clona el puesto.
       - `Borrar`: Elimina el puesto.

---

## 3. Plan de Verificación

1. **Prueba de Iconos**:
   - Asignar emoji e icono Lucide a instituciones y verificar que se persistan en BD y muestren en la tarjeta.
2. **Prueba de Navegación**:
   - Probar cambiar entre Vista General de Instituciones y Vista Interior con el botón `Ver` y `Volver`.
3. **Prueba de Filtros y Tabla**:
   - Verificar filtrado por Riesgo, Área y Disponibilidad en la tabla interior.
4. **Prueba de Duplicación**:
   - Duplicar puestos e instituciones y verificar respuesta exitosa del servidor.
5. **Verificación de Compilación y Calidad**:
   - `compile_applet` (`npm run build`).
   - `lint_applet` (`tsc --noEmit`).
   - Pruebas automatizadas `npx vitest run src/db/__tests__/employments.test.ts`.
