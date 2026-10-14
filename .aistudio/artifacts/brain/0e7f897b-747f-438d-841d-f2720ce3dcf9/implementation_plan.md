# Refinamiento de Armas: Herencia de Munición, Daño Dinámico, Limitaciones, Modificadores al Equipar y Penalizadores

Ajuste integral del flujo de **Armas** en el Catálogo de Elementos para heredar estrictamente la necesidad de munición desde el Tipo de Arma, filtrar dinámicamente las opciones de daño por dado base, incorporar Limitaciones mecánicas, permitir Modificadores pasivos (Bonos/Penalizadores) para el portador mientras esté equipada, y añadir duración en turnos a los penalizadores al impacto.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Se han incorporado todas las solicitudes y comentarios del usuario:

1. **Modificadores para el Portador (Mientras esté equipada)**:
   - Nuevo bloque en el editor mecánico para definir bonos o penalizadores pasivos que afectan directamente al personaje que tiene el arma empuñada/equipada.
   - Ejemplo: *Arma Pesada: Penalización -1 a Evasión (EVA) mientras esté equipada*.
   - Permite seleccionar si es **Bono (+)** o **Penalización (-)**, el valor numérico y el objetivo: **Atributo** (`FUE`, `DES`, `INT`, `RES`, `VEL`, `VOL`) o **Estadística Derivada** (`EVA`, `RD`, `INI`, `DB`, `COR`, `SAL`, `EST`).
   - Se mapea canónicamente como un comportamiento continuo (`mode: 'continuous'`) con la condición `[{ type: 'equipped' }]` y objetivo `self`.

2. **Eliminación del campo "Número de Cargadores"**:
   - En los parámetros del arma solo se mantiene la **Capacidad de Cargador (balas)**.

3. **Herencia estricta de Munición**:
   - Sin interruptores manuales en el Catálogo; se hereda directamente de `weapon_type.component.usesAmmo`. Si el Tipo de Arma no requiere munición, los campos de munición se ocultan por completo.

4. **Filtrado Dinámico del Dado de Daño**:
   - Se extraen las opciones de `Categorías Mecánicas → Daño` que coinciden con el `baseDice` del Tipo de Arma (ej: si es `D10`, lista `1D10`, `2D10`, etc.).

5. **Limitaciones Mecánicas**:
   - Soporte para *Enfriamiento* (turnos) y *Límite de Uso* (máximo por turno, combate, misión o día).

6. **Penalizadores al Impacto contra el Enemigo con Duración**:
   - `Penalizador [ x ] a [ Atributo | Estadística Derivada ] → [ FUE, DES... | EVA, RD... ] durante [ N ] turnos`.

7. **Descripción Generada Automáticamente**:
   - Refleja: `"Daño [Dado] [Tipo de Daño] + [Mod. Fuerza / Mod. Destreza / Promedio FUE y DES / Sin Modificador] del personaje que lo tiene equipado contra un enemigo."`
   - Si tiene modificadores de equipo: `"Mientras esté equipada: Aplica [Bono/Penalizador] al portador."`
   - Detalla las limitaciones y estados alterados/penalizadores al impacto.

---

## 1. Overview & Core Concept

- **Dos Dimensiones Mecánicas de un Arma**:
  1. **Comportamiento Ofensivo Activo (Al disparar / atacar)**:
     - Daño base (filtrado según dado base del tipo de arma).
     - Modificador por atributo del personaje que la empuña (FUE, DES, Promedio o Calibre fijo).
     - Limitaciones del ataque (cooldown, usos por combate).
     - Efectos secundarios al impactar (Estados alterados, Penalizadores con duración en turnos).
  2. **Efecto Pasivo Continuo al Portar (Mientras esté equipada)**:
     - Modificaciones pasivas al usuario del arma (ej. -1 EVA en armas pesadas, +1 Iniciativa en armas tácticas ligeras, etc.).

---

## 2. User Experience & Visual Design

### Parámetros del Arma (Pestaña Información)
```
┌────────────────────────────────────────────────────────────────────────┐
│ PARÁMETROS DEL ARMA                                                    │
├────────────────────────────────────────────────────────────────────────┤
│ Tipo de Arma:            [ Arma de Fuego                      ▼ ]      │
│ Dado Base: D10           Modificador: Ninguno (Fijo por Calibre)       │
│ Munición: SÍ (Heredado de Tipo de Arma)                                │
├────────────────────────────────────────────────────────────────────────┤
│ (Solo si usesAmmo === true):                                           │
│ Munición Compatible:     [ 9mm Parabellum (Catálogo)          ▼ ]      │
│ Calibre de Munición:     [ 9mm Parabellum                      ]       │
│ Capacidad de Cargador:   [ 12 ] balas por cargador                     │
└────────────────────────────────────────────────────────────────────────┘
```

### Efectos Mecánicos del Arma (Pestaña Efectos)
```
┌────────────────────────────────────────────────────────────────────────┐
│ EFECTOS MECÁNICOS DEL ARMA                                             │
├────────────────────────────────────────────────────────────────────────┤
│ 1. EFECTO PRIMARIO DE ATAQUE: DAÑO                                     │
│ Daño: [ 1D10 ▼ ]  (Filtrado de Reglas del Sistema para D10)            │
│       │ 1D10 │                                                         │
│       │ 2D10 │                                                         │
│ Tipo de Daño: [ Físico ▼ ]                                             │
│ Modificador: Suma Mod. de DES/FUE del personaje equipado               │
├────────────────────────────────────────────────────────────────────────┤
│ 2. MODIFICADORES AL PORTADOR (Mientras esté equipada)                  │
│ [+ Añadir Modificador al Equipar]                                      │
│ • Penalización [ 1 ] a [ Estadística Derivada ▼ ] → [ EVA (Evasión) ▼ ]│
│   (Aplica continuamente al usuario mientras tenga el arma equipada)    │
│   [ Eliminar ]                                                         │
├────────────────────────────────────────────────────────────────────────┤
│ 3. LIMITACIONES DEL ARMA (Opcionales)                                  │
│ [+ Añadir Limitación]                                                  │
│ • Enfriamiento: [ 1 ] turno(s)                          [ Eliminar ]   │
│ • Límite de uso: Máximo [ 2 ] por [ combate ▼ ]         [ Eliminar ]   │
├────────────────────────────────────────────────────────────────────────┤
│ 4. EFECTOS SECUNDARIOS AL IMPACTO (Contra el enemigo)                  │
│ [+ Añadir Estado Alterado]   [+ Añadir Penalizador al Objetivo]        │
│                                                                        │
│ • Penalizador al Objetivo:                                             │
│   Penalizador [ 1 ] a [ Estadística Derivada ▼ ] → [ RD ▼ ]            │
│   Duración: [ 2 ] turnos                                [ Eliminar ]   │
│                                                                        │
│ • Estado Alterado:                                                     │
│   Estado [ Aturdido ▼ ]   Duración: [ 2 ] turnos        [ Eliminar ]   │
├────────────────────────────────────────────────────────────────────────┤
│ RESUMEN DE RESOLUCIÓN AUTOMÁTICO:                                      │
│ "Ataque con arma: Inflige 1D10 de daño Físico + Mod. Destreza del      │
│ personaje que lo tiene equipado contra un enemigo.                     │
│ Mientras esté equipada: Penalización -1 a Evasión (EVA) al portador.   │
│ Al impactar: Aplica -1 a RD (2 turnos). Limitación: 1t enfriamiento."  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Product Decisions & Trade-Offs

- **Modelado Canónico de Modificadores al Portador**:
  - *Decisión*: Se estructuran como un comportamiento continuo independiente (`mode: 'continuous'`, `conditions: [{ type: 'equipped' }]`, `target: { type: 'self' }`).
  - *Beneficio*: Es 100% compatible con la función `calculateDerivedStats()` y el `mechanicalRuntime.ts`, por lo que el personaje ve automáticamente reflejado el bono o penalizador en su ficha tan pronto como equipa el arma.
- **Diferenciación entre Efectos al Portador y Efectos al Objetivo**:
  - *Decisión*:
    - Modificadores al portador: target `self`, condicionados a `equipped`, modo continuo.
    - Penalizadores al objetivo: target `enemy`, modo activo al disparar, con duración finita en turnos.
  - *Beneficio*: Claridad conceptual absoluta para el administrador y el sistema de combate.

---

## 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ELEMENTO EN CATÁLOGO: ARMA                        │
│                                                                      │
│  metadata: {                                                         │
│    weaponTypeId: "heavy_weapon",                                     │
│    baseDice: "D10",                                                  │
│    damageModifier: "FUE",                                            │
│    usesAmmo: false,                                                  │
│    magazineCapacity: 0                                               │
│  }                                                                   │
│                                                                      │
│  mechanicalBehaviors: [                                              │
│    // 1. Comportamiento Activo de Ataque                             │
│    {                                                                 │
│      id: "beh_attack",                                               │
│      name: "Disparo / Ataque",                                       │
│      mode: "active",                                                 │
│      activation: { actionType: "action", timing: "immediate" },      │
│      target: { type: "enemy" },                                      │
│      limitations: [ ... ],                                           │
│      effects: [                                                      │
│        { type: "damage", dice: "1D10", damageType: "fisico" },        │
│        { type: "status_apply", statusElementId: "stunned", ... },    │
│        { type: "penalty", targetStat: "RD", amount: 1, ... }         │
│      ]                                                               │
│    },                                                                │
│    // 2. Comportamiento Continuo Pasivo (Solo si tiene mod. equip)   │
│    {                                                                 │
│      id: "beh_equipped_passive",                                     │
│      name: "Efecto al equipar",                                      │
│      mode: "continuous",                                             │
│      conditions: [{ type: "equipped" }],                             │
│      target: { type: "self" },                                       │
│      effects: [                                                      │
│        { type: "penalty", targetStat: "EVA", amount: 1, ... }        │
│      ]                                                               │
│    }                                                                 │
│  ]                                                                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Plan de Ejecución

1. **Actualizar `src/views/CatalogAdmin.tsx`**:
   - Eliminar el campo "Número de Cargadores".
   - Eliminar el interruptor manual `¿Requiere Munición?`.
   - Derivar `usesAmmo` de la opción seleccionada de `weapon_type`.
   - Mostrar campos de munición únicamente cuando `usesAmmo === true`.

2. **Actualizar `src/components/mechanics/WeaponMechanicalEffectsEditor.tsx`**:
   - **Daño Primario**:
     - Filtro dinámico de opciones de `damage` desde `mechanics` según el `baseDice` (`1D10`, `2D10`).
   - **Modificadores para el Portador (Al Equipar)**:
     - Botón `+ Añadir Modificador al Equipar`.
     - Selector: Bono (+) o Penalización (-).
     - Selector de tipo: Atributo o Estadística Derivada.
     - Selector específico: FUE, DES, INT, RES, VEL, VOL o EVA, RD, INI, DB, COR, SAL, EST.
     - Valor numérico.
     - Sincronización automática con un comportamiento continuo `{ mode: 'continuous', conditions: [{ type: 'equipped' }] }`.
   - **Limitaciones**:
     - Botón `+ Añadir Limitación`.
     - Soporte para Cooldown (turnos) y Límite de Uso (usos por turno/combate/misión/día).
   - **Efectos Secundarios al Impacto**:
     - Estados Alterados canónicos con duración en turnos.
     - Penalizadores contra el objetivo con duración en turnos.
   - **Resumen Narrativo**:
     - Incluye daño + modificador de atributo del portador + modificadores de equipo pasivos + limitaciones y efectos de impacto.

3. **Verificación y Pruebas**:
   - `lint_applet` para validar tipado estricto.
   - `compile_applet` para asegurar compilación exitosa.
   - Ejecución de tests del sistema de equipamiento y reglas.
