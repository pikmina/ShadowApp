# Motor universal de reglas y efectos

Este contrato rige Reglas del Sistema, Catálogo, Técnicas y los consumidores del dominio. Sustituye la composición anterior que fijaba la duración dentro de cada efecto. CE significa **Coste de Estamina**, nunca puntos de diseño ni precio de adquisición.

## Fuente de verdad y composición

PostgreSQL conserva `system_rules/system_mechanics`. Una categoría tiene ID estable, nombre editable, ámbito y opciones. Las 35 categorías core tienen además `coreKey` e ID reservado `core.<key>`; ni la interfaz ni la API permiten eliminarlas o cambiar su identidad. Las opciones y sus costes sí son editables. Los IDs referenciados por elementos no se pueden retirar.

Una opción pertenece a una de tres variantes:

- `effect`: comportamiento cerrado, valor semántico y disparador; incluye daño, curación, barrera, modificadores, estado, ajuste de coste y resolución manual.
- `component`: aplicación, temporalidad, uso, condiciones, costes, consecuencias o caps.
- `cost_modifier`: ajuste numérico de CE, conservado para compatibilidad.

Los nuevos efectos se crean sin duración integrada. Las definiciones anteriores que ya contienen `duration` se conservan y pueden sustituirse explícitamente. Una duración referenciada en el grupo prevalece al resolver, sin modificar la definición guardada.

Catálogo y Técnicas guardan exclusivamente referencias:

```ts
{ applicationId, mechanicId, ruleId, groupId? }
```

No copian nombres, costes, dados ni cantidades. `groupId` agrupa efectos y componentes que comparten configuración; es una identidad local, no una regla. Su ausencia representa el grupo legado `default`. Una misma opción puede aparecer en grupos distintos con `applicationId` distintos. Las referencias duplicadas dentro de un grupo, los IDs de aplicación duplicados y los componentes incompatibles invalidan el resultado completo.

## Dimensiones independientes

| Dimensión | Contrato |
| --- | --- |
| Efectos | Unión cerrada de `MechanicalEffectDefinition`; las etiquetas nunca ejecutan comportamiento. |
| Objetivo | Permisos independientes `self`, `allies`, `enemies`. Las categorías anteriores conservan su targeting si no hay componente que lo sustituya. |
| Cantidad | Mínimo y máximo de objetivos únicos. El ejecutor valida una selección explícita; no inventa candidatos. |
| Rango / área | Metros y radio medidos desde el portador en esta versión. El llamador entrega distancias verificadas. |
| Duración | Instantáneo, N turnos, sostenido o mientras se cumpla la condición. |
| Activación | Demora en turnos, señal manual opcional o modo pasivo. |
| Cooldown | Espera independiente de la duración. Dos turnos completos de espera: activación en T permite repetir desde T+3. Sin cooldown no se añade espera. |
| Mantenimiento | Débito del recurso configurado en cada turno activo posterior a la activación. |
| Uso | Contador por ID de turno, combate, misión o día. Cambiar de periodo abre otro contador. |
| Condición | Predicados AND/OR; varias opciones de condición se combinan mediante AND. |
| Consecuencia | Débito propio, consumo, modificador temporal, estado o recoil, en su momento configurado. |
| Caps | Coste de Estamina, daño, curación, barrera y modificador de atributo. El modificador acumulado se limita al proyectar atributos. |

Un **requisito** comprueba si se permite ejecutar; un **limitador** expresa una restricción de uso y puede llevar un descuento CE configurado; un **coste** se paga al activar; una **consecuencia** ocurre al activar, por turno, al terminar o después del daño. Ningún descuento se deduce automáticamente del texto.

Los predicados leen contacto físico/visual/auditivo, consciencia de los objetivos, porcentaje de SA/ES, habilidad activa por ID, inventario por ID, señales manuales y dados individuales. No interpretan descripciones. Un máximo de recurso desconocido o cero no satisface un umbral porcentual. La resolución manual produce un aviso al Master y nunca decide su resultado.

## API del dominio

- `resolveAppliedMechanics`: valida referencias y resuelve grupos contra la configuración actual. Devuelve efectos materializados, componentes, coste y problemas. Un error devuelve cero efectos ejecutables y coste `null`.
- `evaluateRuleGroup`: genera un plan puro de operaciones y un nuevo estado de usos, preparación, duración y cooldown. Los eventos tienen IDs estables para impedir reejecuciones. Los tiempos usan un contador de turnos monotónico; los IDs de periodo controlan los reinicios de usos.
- `applyRuleOperations`: aplica el lote sobre una copia del mundo. Los dados de daño son resultados explícitos por `applicationId`. Valida cantidad y caras, absorbe daño con barrera y devuelve el daño efectivo. Los recursos, consumo, modificadores y estados no mutan las entradas. La Salud puede quedar negativa; la clasificación de desmayo o muerte corresponde a las reglas del consumidor, no a un límite cero inventado por el motor.
- `executeRuleGroup`: une evaluación y aplicación; un fallo devuelve el mundo y estado anteriores.
- `executeRuleSet`: ejecuta los grupos de una entidad como una operación atómica en memoria y cobra el mínimo contextual una sola vez.
- `expireRuleEffects` y `projectRuleAttributes`: retiran efectos caducados y calculan modificadores acumulados sin alterar atributos base.
- `adjustedStaminaCost`: aplica los ajustes de coste activos de un ámbito, como `quirk`, respetando el mínimo.
- `resolvePassiveEffects`: obtiene una proyección condicionada para las estadísticas de la ficha. Cargar o recalcular no cobra recursos.

Los grupos pasivos no pagan CE ni mantenimiento. Al proyectarlos de nuevo se reemplaza su fuente; no se acumulan por recargar. Los pasivos no deben usar efectos instantáneos de daño, curación, barrera o moneda.

El llamador suministra el estado autorizado: portador, objetivos seleccionados, distancias, señales narrativas, tiradas, recursos y periodos. Debe persistir conjuntamente el mundo y el estado devueltos. El repositorio todavía no tiene un módulo de combate persistido; estos contratos no crean por sí solos una sesión remota de combate. El recoil se evalúa con el evento `after_damage` y el daño efectivo devuelto por la aplicación. Monedas siguen requiriendo el servicio transaccional de economía; una excepción de regla o elección produce una resolución pendiente explícita.

## Semillas, migración y compatibilidad

`seedCoreRules` corre al iniciar el servidor, dentro de una transacción y con el mismo bloqueo de coordinación que las escrituras de reglas y elementos. Agrega categorías ausentes y el elemento de estado `core.status.stunned`. No se ejecuta desde GET, montaje de componentes ni hidratación.

No modifica el esquema SQL: categorías, opciones y referencias utilizan los campos JSON ya existentes. La migración valida el catálogo anterior, conserva IDs y opciones existentes, y añade las categorías del espacio reservado `core.*`. Las categorías anteriores pueden recibir los discriminadores de compatibilidad que ya definía el esquema. Una colisión de identidad core o un catálogo inválido detiene la migración sin escribir datos parciales.

Las opciones iniciales son ejemplos editables, con CE adicional 0 hasta que el administrador configure el balance. Los IDs de habilidad/consumible de las opciones genéricas deben configurarse antes de utilizarlas. Aturdido se registra como un estado borrador; su comportamiento específico se define en el catálogo, no se inventa como una regla de denegación de turnos.

CREATE aplica valores iniciales a datos ausentes. LOAD devuelve lo persistido. UPDATE conserva campos omitidos. Publicar valida también los efectos almacenados cuando el payload omite `effects`. Los formatos antiguos se pueden conservar como borrador, pero requieren sustitución explícita por referencias antes de publicar. Los requisitos antiguos de adquisición se mantienen visibles sin ampliar su formato.

## Casos comprobados

1. Bono +2 FUE, duración 2 turnos, aliados, hasta 3 objetivos.
2. Líder nato: señal `speech`, recuperación de 2 ES, hasta 3 aliados, una vez por combate.
3. Canalización Exigente: pasivo, umbral ES ≤50 %, duración condicional y ajuste +1 al ámbito `quirk`.
4. Emocionalidad Frágil: señal `intense_emotion` AND dado individual entre 1 y 5, resolución manual.
5. Demora 1 turno, daño 4D8, radio 50 m, estado Aturdido y un uso por combate.
6. Barrera 30 con cooldown independiente de 2 turnos.

Las pruebas cubren además repetición de eventos, rollback de varios grupos, consumo, mantenimiento, penalización al terminar, caps, expiración, referencias rotas y ciclo de persistencia mediante un adaptador transaccional de prueba. La comprobación contra PostgreSQL real depende de la configuración de conexión del entorno.

---

# Fase 1: Arquitectura de MechanicalBehavior y Persistencia JSONB (Septiembre 2026)

## 1. Resumen y Propósito

La Fase 1 introduce el modelo de dominio estructurado `MechanicalBehavior`, superando las limitaciones de la lista plana de referencias con `groupId`. Un elemento del sistema (`SystemElement`, como un rasgo, debilidad, técnica, habilidad o equipamiento) ahora puede definir múltiples comportamientos mecánicos independientes, cada uno con su propio ciclo de vida, modo de activación, condiciones, resolución y efectos asociados.

## 2. Persistencia y Coexistencia Legacy

- **Columna de base de datos:** La tabla `system_elements` cuenta con la columna `mechanical_behaviors` de tipo `JSONB NOT NULL DEFAULT '[]'::jsonb`.
- **No destructivo:** No se eliminan ni sobreescriben las referencias legacy almacenadas en `effects`. La capa de datos en `src/db/elements.ts` (`upsertElement`) y `src/domain/elementMechanics.ts` acepta y preserva ambos campos.
- **Separación de operaciones (CREATE / LOAD / UPDATE):**
  - `CREATE`: Si no se proporcionan comportamientos, se inicializa como arreglo vacío `[]`.
  - `LOAD`: Se restauran exactamente los comportamientos persistidos en base de datos.
  - `UPDATE`: Si el payload contiene `mechanicalBehaviors`, se persisten directamente; si se omite, se conserva el valor preexistente en base de datos.

## 3. Estructura del Dominio `MechanicalBehavior`

Definido mediante esquemas Zod en `src/domain/mechanicalBehavior.ts`:

1. **Identidad y Metadatos:**
   - `id`: Identificador único y estable (UUID / nanoid).
   - `name`: Nombre descriptivo del comportamiento.
   - `description`: Descripción narrativa / funcional.
   - `internalNotes`: Notas internas para Master / Balance.
2. **Modo:**
   - `active`: Acción deliberada que el personaje emprende en su turno (o mediante acción rápida/reacción voluntaria).
   - `reactive`: Se dispara automáticamente cuando ocurre un evento o disparador específico (ej. recibir daño, bajar del 50% de ES).
   - `continuous`: Efecto pasivo, sostenido o aura que permanece activo continuamente o mientras se cumpla una condición.
3. **Activación (`activation`):**
   - Tipo de acción (`action`, `quick_action`, `voluntary_reaction`, `free_action`, `manual`).
   - Tiempo de preparación (`immediate`, `turns`, `manual`).
4. **Disparador (`trigger`):**
   - Relevante principalmente en modo `reactive`. Contiene el tipo de evento (`receive_damage`, `hp_below_threshold`, `es_below_threshold`, `die_roll`, `status_applied`, `element_used`, etc.), recurso, umbral y dirección de cruce (`cross_down`, `cross_up`, `any`).
5. **Condiciones (`conditions`):**
   - Grupo de predicados estructurados con operador `AND` u `OR`.
   - Tipos de condición: recurso numérico, porcentaje de recurso, tirada de dados, resultado de dado individual, presencia de estado alterado, agregados del turno actual (ej. daño recibido > 10), historial del turno (ej. técnica usada en el turno anterior), etiquetas (`tag`), objetos en inventario, valor de atributo y señales manuales.
6. **Resolución (`resolution`):**
   - `automatic`: El efecto se aplica sin tiradas.
   - `roll`: Tirada propia con fórmula de dados (`diceFormula`), atributo base (`attributeId`), dificultad (`difficulty`) y márgenes de éxito.
   - `contested`: Enfrentamiento entre atacante y defensor con fórmulas independientes y resolución de empate.
   - `manual`: Resolución narrativa o por juicio del Master.
7. **Efectos (`effects`):**
   - Lista ordenada de sub-efectos ejecutables:
     - `damage`: Fórmula de daño, tipo de daño (físico, elemental, etc.) y penetración de armadura/barrera.
     - `healing`: Recuperación de Salud o Estamina.
     - `barrier`: Otorgamiento de escudo protector con absorción de daño.
     - `attribute_modifier`: Bonificación o penalización a atributos base (`FUE`, `DES`, `RES`, `INT`, `VOL`, `VEL`).
     - `resource_modifier`: Modificación directa a reservas de SA o ES.
     - `cost_modifier`: Aumento o descuento de Coste de Estamina (CE) por ámbito.
     - `status`: Aplicación o remoción de estados alterados (por ID de estado).
     - `action_block`: Bloqueo de acciones (técnicas, quirks, movimiento).
     - `turn_loss`: Pérdida de turno de combate.
     - `counter_modifier`: Incremento, decremento o reseteo de contadores locales.
     - `inventory_consume` / `inventory_reserve` / `inventory_release`: Gestión de objetos.
     - `manual`: Efectos narrativos personalizados.
8. **Objetivo (`target`):**
   - Tipo de objetivo (`self`, `ally`, `enemy`, `character`, `object`, `area`, `roll`, `resource`, `active_element`, `manual`).
   - Cantidad: Modo (`exact`, `up_to`, `all`) y cuenta máxima.
   - Rango: Modo (`self`, `contact`, `distance`, `unlimited`, `manual`) y distancia en metros.
   - Área: Forma (`radius`, `cone`, `line`, `zone`) y dimensiones en metros.
   - Restricciones de selección (`nearest`, `random`, `specific`, `exclude`).
9. **Temporalidad (`temporality`):**
   - Tipo (`instant`, `turns`, `sustained`, `conditional`, `permanent`).
   - Mantenimiento: Coste periódico por turno activo.
   - Consecuencia al expirar: Recoil, penalización o remoción de estado.
10. **Limitaciones (`limitations`):**
    - Usos máximos con ámbito de reinicio (`per_turn`, `per_combat`, `per_rest`, `per_mission`, `per_day`).
    - Cooldown en turnos.
    - Límites numéricos máximos (caps) en daño, curación y bonos de atributos.
11. **Control Avanzado (`advancedControl`):**
    - Escalado por nivel de habilidad (multiplicadores de daño, curación y duraciones).
    - Condiciones de interrupción involuntaria (ej. al recibir daño, perder consciencia).

## 4. Editor Visual Reutilizable (`MechanicalBehaviorsEditor`)

El componente `src/components/mechanics/MechanicalBehaviorsEditor.tsx`:
- **Reutilizable:** Integrado tanto en `/admin/catalog` (`CatalogAdmin.tsx`) como en `/admin/techniques` (`TechniquesAdmin.tsx`).
- **Pestaña de Convivencia Legacy:** Si el elemento tiene referencias en `effects`, presenta un selector visual para alternar entre "Comportamientos Nuevos" y "Efectos Legacy", garantizando compatibilidad absoluta con datos anteriores.
- **Diseño Dinámico por Modo:** Oculta o resalta secciones según el modo seleccionado (ej. la sección de Disparador se muestra predominantemente en modo `reactive`, mientras que Activación se resalta en modo `active`).
- **Secciones Colapsables:** Organizado en acordeones temáticos con el lenguaje visual de ShadowApp (tokens de Tailwind, tipografías del sistema, bordes sutiles y contraste estético).
- **Soporte Multinivel:** Si el elemento es de tipo habilidad (`skill`), permite previsualizar y configurar el escalado por niveles.

---

# Fase 3: Consecuencias, Efectos Secundarios y Caps Canónicos (Septiembre 2026)

Esta sección consolida el diseño e implementación de las 8 reglas mecánicas definitivas introducidas en **RULES-DATA-4B**, incluyendo la precisión del pipeline defensivo de recoil sobre daño final, mitigación de barreras y sumado multi-objetivo.

## 1. Las 8 Reglas Mecánicas del Catálogo Canónico

| Regla | Identificador Core | CE | isAvailable | Comportamiento en Runtime / Ciclo de Vida |
| :--- | :--- | :---: | :---: | :--- |
| **1. Daño periódico por turno** | `core.consequence.self_damage_turn` | `-1` | `true` | El turno de activación NO cobra el daño. El portador recibe **1 HP** de daño al inicio de cada uno de sus turnos posteriores (duración 3). |
| **2. Daño propio fijo** | `core.consequence.self_damage_fixed_2` | `-1` | `true` | Recibe **2 HP** de daño directo de SA de forma atómica en el momento exacto de la resolución de la técnica. |
| **3. Recoil sobre daño final** | `core.consequence.recoil_half` | `-4` | `true` | Recibe como daño propio el **50% del daño final efectivamente infligido** al objetivo (fórmula `Math.floor(finalDamage * 0.5)`). |
| **4. Penalización al expirar** | `core.consequence.after_effect_int2_3t` | `-3` | `true` | Al finalizar la duración activa de la técnica, se aplica una penalización de **-2 INT** durante 3 turnos completos al portador. |
| **5. Modificador mientras activo** | `core.consequence.while_active_des2` | `-2` | `true` | Aplica un penalizador de **-2 DES** que dura mientras la técnica esté activa. No se acumula ni se multiplica en cada turno de mantenimiento. |
| **6. Modificador por turno activo** | `core.consequence.int2_per_active_turn` | `-1` | `false` | *Pendiente de Decisión Semántica (Ambigüedad)*. Se preserva en base de datos pero se marca como no elegible en interfaz (`isAvailable: false`). |
| **7. Estado bajo umbral** | `core.consequence.overheated_threshold` | `-3` | `true` | Si tras cobrar el coste de la técnica el portador queda con **EST <= 5**, adquiere inmediatamente el estado **Sobrecalentado** (`core.status.sobrecalentado`). |
| **8. Cap de absorción de barrera** | `core.caps.absorb_max_6` | `-3` | `true` | Al mitigar daño, las capas de barrera absorben un **máximo de 6 puntos de daño por impacto**. El excedente penetra directamente a la salud. |

---

## 2. Pipeline Canónico de Recoil (Daño Final Infligido)

El daño de recoil (`core.consequence.recoil_half`) opera de forma reactiva y determinista sobre el **daño final neto recibido por el objetivo**, no sobre el daño raw o fórmula declarada.

### Pipeline Conceptual de Daño:
1. **Fórmula de Daño Raw** (ej. dados o valor fijo)
2. **Modificadores Outgoing** (ofensivos del atacante)
3. **Modificadores Incoming** (defensivos del objetivo / modificadores de daño pendientes)
4. **Mitigación por Barrera** (absorbe daño reduciendo el escudo del objetivo)
5. **Daño Final Infligido** (`finalDamage` neto que afecta directamente a la SA)
6. **Cálculo de Recoil** = `Math.floor(finalDamage * 0.5)`

### Regla de Redondeo:
Se utiliza estrictamente la función `Math.floor` sobre el total final:
- Daño final = `10` → recoil = `5`
- Daño final = `7`  → recoil = `3`
- Daño final = `1`  → recoil = `0`
- Daño final = `0` (daño completamente mitigado por barreras o defensas) → recoil = `0` (no hay autodaño si el ataque no logra penetrar).

---

## 3. Comportamiento en Múltiples Objetivos (Multi-Target Recoil)

Cuando una técnica con recoil afecta a múltiples objetivos (ej. un ataque de área en `executeMultiTargetBehavior`), el runtime agrega los resultados de la siguiente forma para evitar anomalías y distorsiones de redondeo:

1. El pipeline defensivo procesa individualmente el daño efectivo de cada objetivo: $Da\tilde{n}o_A, Da\tilde{n}o_B, ...$
2. Se calcula la **Suma Atómica** de todos los daños finales efectivos:
   $$\text{TotalFinalDamageDealt} = \sum (\text{finalDamage}_i)$$
3. Se aplica la tasa de recoil (50%) **una sola vez** sobre la suma agregada:
   $$\text{RecoilDmg} = \lfloor \text{TotalFinalDamageDealt} \times 0.5 \rfloor$$

*Ejemplo:*
- Objetivo A recibe `6` de daño final (Raw 10 - Barrera 4)
- Objetivo B recibe `4` de daño final (Raw 10 - Barrera 6)
- Daño Total = `10` → Recoil = `5` (en lugar de `floor(6 * 0.5) + floor(4 * 0.5)`).

---

## 4. Garantías de Persistencia y Seguridad (Anti-Recursión)

- **Protección de Bucle Infinito:** El daño por recoil se aplica de forma interna decrementando directamente el recurso `SA` de la entidad origen sin emitir nuevos eventos de ataque ofensivos. Esto evita de forma matemática que el recoil vuelva a disparar recoil de forma infinita.
- **Autoridad de Base de Datos:** Los costes de las consecuencias (ej. recoil = -4 CE) se leen dinámicamente de `system_rules/system_mechanics`. El administrador puede sobrescribir estos valores y el motor los recalculará instantáneamente respetando las directivas del sentinel de persistencia (`migration_rules_data_4b`).
