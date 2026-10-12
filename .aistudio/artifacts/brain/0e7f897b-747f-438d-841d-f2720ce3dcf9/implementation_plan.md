# Plan de Implementación: Naturaleza de Defensa por Tipo de Daño e Identificadores Legibles

Este plan detalla cómo permitir que cada **Tipo de Daño** en el Editor de Reglas Mecánicas (Catálogo del Sistema) configure su naturaleza defensiva por defecto (Físico vs Evasión o Mental vs Coraje), heredando automáticamente esta regla al crear técnicas en el Creador de Mecánicas, además de generar **Identificadores Legibles** (slugs amigables como `id: "sensorial"`) en el registro de reglas.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Decisiones de arquitectura y flujo confirmadas con el usuario:

- **1. Configuración de Naturaleza Defensiva en el Editor de Reglas (`UniversalRulesCatalog.tsx`)**:
  - Cada opción en la categoría **Tipo de Daño** (`damage_type`) tendrá un selector explícito para configurar su **Naturaleza de Defensa**:
    - **Físico (Evasión - EVA)**
    - **Mental (Coraje - COR)**
  - Opciones existentes como `psiquico`, `sensorial`, `motor` y `anomalia_don` se pre-configurarán con naturaleza **Mental (Coraje)**, mientras que los tipos elementales/físicos (`fuego`, `cortante`, `fisico`, etc.) se configurarán con **Físico (Evasión)**.

- **2. Herencia Automática en el Creador de Técnicas (`MechanicalBehaviorsEditor.tsx`)**:
  - Al seleccionar un Tipo de Daño al crear una técnica, el creador consultará la regla configurada en el catálogo.
  - Si el Tipo de Daño es de naturaleza **Mental (Coraje)**, la técnica activará automáticamente el modo **VS Coraje**.
  - El usuario podrá anular manualmente la selección activando o desactivando el Switch **VS Coraje** si la técnica lo requiere.

- **3. Identificadores Legibles en Nuevas Reglas (`slugifyId`)**:
  - Al registrar nuevas reglas o categorías en el catálogo, el sistema derivará automáticamente el ID y `runtimeKey` en minúsculas y sin acentos (ej. `"Sensorial"` $\rightarrow$ `id: "sensorial"` / `runtimeKey: "sensorial"`).

---

### 1. Overview & Core Concept

- **Objetivo**:
  Establecer la regla de defensa primaria (Físico/Evasión vs Mental/Coraje) directamente a nivel de Catálogo de Reglas para los Tipos de Daño, eliminando errores de configuración en las técnicas y garantizando que los IDs de las reglas mecánicas sean legibles y semánticos.

- **Beneficio**:
  Al seleccionar un tipo de daño como "Sensorial" o "Psíquico", la técnica sabrá automáticamente que se tira contra Coraje sin requerir configuración manual repetitiva, manteniendo el control de anulación manual en el switch **VS Coraje**.

---

### 2. User Experience & Visual Design

1. **Editor de Reglas Mecánicas (`UniversalRulesCatalog.tsx`)**:
   - En la sección de edición para las opciones de la categoría **Tipo de Daño**, se muestra un selector de **Defensa Objetivo por Defecto**:
     - `[ Físico (Evasión) | Mental (Coraje) ]`.
   - Al guardar o crear nuevos tipos de daño (ej. "Sensorial"), el ID asignado se genera limpia y automáticamente como `sensorial`.

2. **Creador de Técnicas / Mecánico (`MechanicalBehaviorsEditor.tsx`)**:
   - Al añadir un efecto de daño y cambiar el **Tipo de Daño** (ej. a "Sensorial" o "Mental"), el creador consulta la opción seleccionada.
   - El Switch **VS Coraje** se ajusta automáticamente según la regla del catálogo:
     - Si la opción es de naturaleza Mental $\rightarrow$ Switch **VS Coraje** encendido (`vsCourage: true`).
     - Si es de naturaleza Física $\rightarrow$ Switch **VS Coraje** apagado (`vsCourage: false`).
   - Un distintivo sutil indica: *"Heredado del tipo de daño (VS Coraje)"*, el cual se actualiza de inmediato si el usuario cambia el switch manualmente.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Atributo `defenseType` en las Opciones del Catálogo**:
  - *Elección*: Almacenar `defenseType: 'evasion' | 'courage'` en el objeto de configuración/parámetros de la opción de tipo de daño.
  - *Por qué*: Centraliza la lógica en las Reglas del Sistema, evitando depender de comparaciones de texto sueltas.

- **Decisión 2: Generador de Slugs `slugifyId`**:
  - *Elección*: Función de conversión que elimina tildes, caracteres especiales y espacios, produciendo cadenas en minúsculas.
  - *Ejemplo*: `"Sensorial"` $\rightarrow$ `"sensorial"`, `"Aumento de Daño"` $\rightarrow$ `"aumento_de_dano"`.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           System Rules Catalog (damage_type options)                           │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Option "Sensorial"      ──► defenseType: 'courage'   ──► id: "sensorial"                        │
│ Option "Fuego"          ──► defenseType: 'evasion'   ──► id: "fuego"                            │
└────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                            Technique Creator (Effect Execution)                                │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│  User selects "Sensorial" Damage Type                                                           │
│  └─► Look up option rule in catalog                                                             │
│      └─► defenseType === 'courage' ──► Auto-set Switch VS Coraje = ON                            │
│                                        (Manual toggle override still available)                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Archivos Afectados**:
  1. `src/domain/coreRuleCatalog.ts`: Inclusión de `defenseType: 'evasion' | 'courage'` en las opciones por defecto de `damage_type`.
  2. `src/components/mechanics/UniversalRulesCatalog.tsx`:
     - UI para editar `defenseType` en las opciones de `damage_type`.
     - Implementación de `slugifyId(name)` para IDs legibles en nuevas reglas/opciones.
  3. `src/components/mechanics/MechanicalBehaviorsEditor.tsx`:
     - Consulta de `defenseType` del tipo de daño seleccionado para ajustar automáticamente `vsCourage`.
     - Switch **VS Coraje** para permitir anulación manual.
  4. `src/domain/characterTechnique.ts`:
     - Asegurar que la resolución de tiradas tome en cuenta `vsCourage` para la tirada contra Coraje (COR).
