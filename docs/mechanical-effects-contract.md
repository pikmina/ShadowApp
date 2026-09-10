# Contrato canónico de efectos, costes y destinatarios

## Propósito

Este documento define la única arquitectura admitida para efectos mecánicos nuevos. Complementa `system-core-architecture-plan.md` y debe leerse antes de modificar Reglas, Catálogo, Técnicas, combate, fichas o persistencia de elementos.

El objetivo es impedir que nombres parecidos creen comportamientos duplicados. “Ofensiva”, “Daño” y “2D6” pertenecen a niveles diferentes:

```text
Clasificación: offensive
  └─ organiza una categoría; no modifica Salud

Efecto: damage
  └─ declara que el resultado reduce Salud

Regla de coste: damage / damage_2d6
  └─ aporta CE al diseño; no ejecuta daño por sí misma
```

## Fuentes de verdad

| Concepto | Fuente |
| --- | --- |
| Comportamiento ejecutable | `CanonicalMechanicalEffect.type` |
| Propiedad afectada | campo semántico de la variante: `attributeId`, `statId`, `statusElementId`, etc. |
| Destinatarios | `CanonicalMechanicalEffect.targeting` |
| Momento de aplicación | `CanonicalMechanicalEffect.timing` |
| Coste CE | reglas referenciadas en `costRules`, resueltas contra `system_rules/system_mechanics` |
| Nombre y descripción | presentación; nunca se ejecutan |
| Clasificación lógica | organización y filtros; nunca se ejecuta |

Un efecto no guarda una copia autoritativa del nombre, descripción o coste de una regla. Una referencia rota invalida el cálculo; no usa un valor histórico como fallback.

## Tipos ejecutables

El conjunto inicial es cerrado:

- `attribute_modifier`: modifica un atributo mediante `attributeId` y `amount`.
- `derived_stat_modifier`: modifica una estadística mediante `statId` y `amount`.
- `damage`: reduce Salud y declara `dice`.
- `healing`: recupera `SA` o `ES` y declara `amount`.
- `barrier`: crea una barrera con cantidad y duración opcional.
- `status`: aplica un `statusElementId` y una duración opcional.
- `currency`: modifica `yen` o `exp`.
- `rule_override`: referencia explícitamente la regla afectada.
- `choice`: declara opciones estructuradas.

Añadir otro tipo requiere actualizar conjuntamente el contrato, el validador, el motor, las pruebas, la API y los consumidores. Crear una categoría nueva en Mecánicas y Costes no crea un tipo ejecutable.

## Destinatarios

Todo efecto canónico contiene:

```ts
interface EffectTargeting {
  allowedEntityKinds: Array<'character' | 'npc'>;
  relationship: 'self' | 'ally' | 'enemy' | 'any';
  selection: 'direct' | 'area';
  minTargets: number;
  maxTargets: number | null;
  overflowSelection?: 'highest_initiative' | 'lowest_initiative';
  targetingCostRuleId?: string;
}
```

Reglas obligatorias:

1. `self` es el personaje o NPC que porta o activa el efecto, no la cuenta autenticada.
2. `self` siempre es directo y selecciona exactamente un destinatario.
3. Aliado, enemigo y cualquiera expresan una relación con la fuente.
4. Área expresa cómo se selecciona; no sustituye la relación.
5. `minTargets` y `maxTargets` son enteros positivos y el mínimo no supera el máximo.
6. `maxTargets: null` solo es válido para área y delega la cantidad final en sus reglas geométricas.
7. Alcance, distancia y línea de visión son contratos distintos.

Ejemplos:

```ts
// Dos enemigos como máximo.
{
  allowedEntityKinds: ['character', 'npc'],
  relationship: 'enemy',
  selection: 'direct',
  minTargets: 1,
  maxTargets: 2
}

// Entre uno y tres aliados.
{
  allowedEntityKinds: ['character', 'npc'],
  relationship: 'ally',
  selection: 'direct',
  minTargets: 1,
  maxTargets: 3
}

// Todos los enemigos válidos dentro de un área.
{
  allowedEntityKinds: ['character', 'npc'],
  relationship: 'enemy',
  selection: 'area',
  minTargets: 1,
  maxTargets: null
}
```

## Mecánicas y Costes

La configuración global se persiste en `system_rules` con la clave `system_mechanics`. Cada categoría y cada regla usan IDs únicos y estables. La API valida la lista antes del `upsert`.

Las categorías pueden clasificarse como ofensivas, defensivas, soporte, control, limitación o utilidad. Esa clasificación no aplica efectos. Sus reglas aportan únicamente componentes de coste CE.

Un efecto canónico contiene cero o más referencias:

```ts
interface CostRuleReference {
  mechanicId: string;
  ruleId: string;
}
```

El motor resuelve cada referencia contra la configuración vigente, rechaza referencias duplicadas dentro del mismo efecto y devuelve coste total, desglose y problemas. Si falta cualquier referencia, el total es inválido y no se presenta como cero.

## Prohibiciones

- No crear un efecto genérico `mechanic_rule` en datos canónicos.
- No usar `logicalType: offensive` como sinónimo de daño.
- No guardar `cost`, `ruleName` o `mechDesc` como fuente mecánica dentro del efecto.
- No usar `target` para atributo, estadística, estado, moneda, regla o destinatario.
- No usar `recipient` como segundo contrato paralelo de destinatario.
- No representar área mediante `relationship`.
- No codificar costes de Daño, Estado o Modificadores dentro del motor.
- No permitir propiedades ajenas a la variante del efecto.
- No publicar efectos que todavía dependan del formato legado.

## Persistencia e hidratación

Los contratos canónicos se guardan dentro de `system_elements.effects`, actualmente una columna JSONB adecuada para la unión discriminada. No se necesita una columna por tipo de efecto.

La API debe validar antes de guardar. LOAD devuelve exactamente el efecto persistido. La UI puede resolver nombres y costes para mostrar, pero no los escribe de vuelta como copias. UPDATE solo modifica el efecto editado y nunca aplica `defaultTargeting` sobre un efecto existente.

`defaultTarget` y el futuro `defaultTargeting` de una categoría son sugerencias exclusivas de CREATE. La fuente de verdad de un efecto creado es su propio `targeting` explícito.

## Transición del formato legado

Los datos existentes se preservan hasta una migración explícita. No se transforman durante carga, montaje de React ni guardado de otro campo.

| Legado | Campo canónico |
| --- | --- |
| `deal_damage` | `type: 'damage'` |
| `modify_attribute.target` | `attributeId` |
| `modify_derived.target` | `statId` |
| `apply_status.target` | `statusElementId` |
| `recover_stat.target` | `resourceId` |
| `recover_stat.recipient` | `targeting.relationship` |
| `grant_currency.target` | `currencyId` |
| `system_override.target` | `ruleId` |
| `mechanic_rule.mechanicId/ruleId` | una entrada de `costRules` del efecto real correspondiente |

Un `mechanic_rule` aislado no indica qué comportamiento ejecuta. No se convierte por el nombre de su categoría. Debe asociarse manualmente con el efecto real o quedar reportado como ambiguo.

Al cambiar el tipo de un efecto, la aplicación crea una variante nueva y copia únicamente los campos compatibles. No conserva propiedades ocultas de la variante anterior.

## Estado de adopción

Implementado:

- tipos y validadores canónicos en `src/domain/systemMechanics.ts`;
- validación de estructura, costes e IDs de `system_mechanics` antes de persistir;
- cálculo canónico sin fallback y con desglose de referencias;
- pruebas de destinatarios, cantidades, propiedades prohibidas, duplicados y referencias rotas.
- editor canónico compartido por Catálogo y Técnicas para todos los efectos nuevos;
- conservación visible y sin normalización automática de efectos legados;
- validación en la API de todo efecto que declare identidad canónica.

Pendiente:

- crear una herramienta explícita de revisión/migración de efectos legados;
- impedir la publicación de efectos legados cuando exista una herramienta de migración capaz de resolverlos sin pérdida;
- conectar ficha y combate al ejecutor de efectos;
- retirar `src/domain/mechanics.ts` y los formularios duplicados cuando ningún consumidor legado permanezca.
