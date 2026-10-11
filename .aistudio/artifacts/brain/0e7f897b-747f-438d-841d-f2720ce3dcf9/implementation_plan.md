# Plan de Implementación: Rediseño Visual y Jerarquía del Catálogo de Empleos

Rediseñar la vista de administración de empleos (`EmploymentsAdmin.tsx`) para reemplazar la lista plana actual por una interfaz estructurada con jerarquía visual de tres niveles (Institución $\rightarrow$ Área/Departamento $\rightarrow$ Puesto), disposición en 2 columnas, soporte para colapsar/expandir áreas, barra superior de búsqueda/filtros y acción para duplicar puestos.

---

## 1. Alcance y Decisiones de Diseño

1. **Barra Superior de Filtros y Búsqueda**:
   - Barra de búsqueda de texto libre que filtra por nombre de puesto, ocupantes o requisitos.
   - Cuatro selectores rápidos:
     - **Institución**: Selector entre todas las instituciones disponibles.
     - **Área Vinculada**: Filtro por departamento/área correspondiente.
     - **Nivel de Riesgo**: Cualquiera, Ninguno, Leve, Moderado, Grave, Extremo.
     - **Disponibilidad**: Todos los puestos, Solo libres (con vacantes disponibles), Ocupados al 100%.

2. **Estructura en Dos Columnas para Instituciones**:
   - Cuadrícula responsive de 2 columnas en pantallas medianas y grandes (`grid grid-cols-1 lg:grid-cols-2 gap-4`).
   - Cada tarjeta de institución muestra su nombre, estado, descripción resumida y botones de acción (`+ Nuevo departamento`, `Editar`, `Eliminar`).

3. **Áreas / Departamentos Colapsables**:
   - Cada departamento cuenta con un control de acordeón/expansor (`ChevronDown` / `ChevronUp`), indicando el conteo de puestos dentro.
   - Estado de expansión por departamento en el cliente (con opción de colapsar o expandir todos).
   - Botón directo para `+ Nuevo puesto`, `Editar depto.` y `Eliminar`.

4. **Tarjetas de Puesto en Formato Compacto Simplificado**:
   - Cabecera con badges de contexto (Institución, Departamento, Nivel de responsabilidad).
   - Acciones en la esquina superior derecha:
     - **Duplicar** (`Copy`): Crea una copia del puesto conservando su configuración, requisitos y bonificaciones, asignándole un nuevo ID y el sufijo `(Copia)`.
     - **Editar** (`Edit2`): Abre el diálogo de edición existente.
     - **Borrar** (`Trash2` / `DeleteAction`): Confirmación y eliminación segura.
   - Título del puesto con tipografía `font-oxanium` y tamaño optimizado.
   - Fila de datos compactos:
     - **Salario**: ¥ con color esmeralda (`text-emerald-400`).
     - **EXP**: Experiencia con color cian (`text-cyan-400`).
     - **Riesgo**: Nivel tabulado destacado en naranja/ámbar según la severidad (`text-amber-400` / `text-orange-400`).
   - Requisitos mostrados como tags compactos y limpios.
   - Pie de tarjeta:
     - Indicador de ocupantes (`Ocupantes: X/Y` o `Libre (1 disponible)`).
     - Botón principal de `Asignar / Administrar Ocupantes`.
     - Chips de ocupantes actuales con botón para retirar.

---

## 2. Archivos Afectados

- `src/views/EmploymentsAdmin.tsx`:
  - Estado de búsqueda y filtros (`searchTerm`, `filterInstitution`, `filterDepartment`, `filterRisk`, `filterAvailability`).
  - Estado de departamentos colapsados (`collapsedDepts: Set<string>`).
  - Función `handleDuplicatePosition(position)` llamando a `POST /api/admin/positions`.
  - Nueva cuadrícula en 2 columnas y componentes de renderizado de tarjeta de puesto compacta.

---

## 3. Plan de Verificación

1. **Filtrado y Búsqueda**:
   - Verificar búsqueda en tiempo real por texto (nombre de puesto, ocupante).
   - Verificar filtros por institución, departamento, riesgo y disponibilidad libre/ocupado.
2. **Interactividad**:
   - Probar minimizar y expandir departamentos individuales.
   - Probar duplicar un puesto existente y comprobar que se crea correctamente en la base de datos sin alterar los datos originales.
   - Probar asignar ocupante, editar puesto y eliminar puesto.
3. **Calidad de Código**:
   - Ejecutar `compile_applet` (`npm run build`).
   - Ejecutar `lint_applet` (`tsc --noEmit`).
   - Ejecutar pruebas de regresión existentes (`npx vitest run src/db/__tests__/employments.test.ts`).
