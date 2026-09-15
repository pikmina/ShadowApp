# Plan del nuevo núcleo de Shadowmore

## Objetivo

Convertir Shadowmore en la fuente autoritativa para definir, calcular, revisar y publicar el sistema de juego. La Tienda pasa a ser un canal de adquisición de elementos ya definidos y deja de crear reglas o efectos.

## Cómo interpretar este documento en ShadowApp

Este plan es el contexto fundacional del repositorio. Sus contratos, invariantes, reglas confirmadas y ejemplos se conservan como referencia funcional completa, aunque una parte todavía no esté implementada en ShadowApp.

Las afirmaciones de finalización del repositorio anterior no se heredan automáticamente. La sección siguiente registra el estado comprobado en ShadowApp; cuando exista una diferencia, ese estado prevalece para decidir qué código falta, pero no elimina la definición funcional del núcleo.

## Actualización: motor universal de reglas (12 septiembre 2026)

El contrato vigente de composición se describe en `docs/mechanical-effects-contract.md`.
Esta actualización prevalece sobre las secciones históricas que incrustan duración y destinatarios en cada opción o enumeran los motores como pendientes.

- Se incorporan 35 categorías core con claves estables, semillas aditivas y protección de borrado.
- Efectos y componentes de aplicación, duración, activación, cooldown, uso, condiciones y consecuencias son independientes; se combinan mediante referencias y `groupId`.
- Catálogo y Técnicas comparten el selector. Reglas administra todos los valores semánticos y CE.
- El dominio incorpora resolución, evaluación de predicados, estado temporal, operaciones y ejecución atómica en memoria, con pruebas.
- Las escrituras de reglas y elementos validan las relaciones dentro de transacciones PostgreSQL coordinadas.
- La ficha utiliza proyecciones de pasivos; las señales narrativas y la actividad de combate se suministran explícitamente al motor.
- Continúa pendiente el módulo de combate persistido, que deberá guardar mundo y estado de ejecución conjuntamente. Los motores no escriben recursos durante LOAD.
- No se migra el esquema SQL. Los formatos anteriores siguen legibles; publicar exige referencias globales válidas.

## Estado histórico de ShadowApp

### Implementado

- Firebase provee la identidad y PostgreSQL conserva el usuario y su rol autorizado.
- La API comprueba permisos mediante `requireRole`.
- Solo existen los roles operativos `admin` y `moderator`; no se crean cuentas de jugador automáticamente.
- `admin` administra Reglas del Sistema y catálogos. `moderator` crea y edita fichas, asigna EXP o yenes y concede inventario o posesiones.
- Las ediciones de personajes usan `updatedAt` para detectar concurrencia y responden `409` cuando la revisión enviada quedó obsoleta.
- Las recompensas, concesiones y compras que afectan varios datos usan operaciones transaccionales.
- En el stock global, `0` significa agotado y `null` significa ilimitado.
- Omitir `profileData` durante UPDATE preserva el valor persistido.
- Un fallo al cargar Reglas produce un estado de error; no inicializa una configuración vacía que pueda sobrescribir datos.
- El cálculo actual de CE está aislado parcialmente en `src/domain/mechanics.ts` y resuelve reglas dinámicas por ID.
- `src/domain/systemMechanics.ts` define y valida el contrato canónico de efectos, destinatarios y referencias de coste, incluido el número mínimo y máximo de objetivos.
- La API valida la estructura y la unicidad de IDs de `system_mechanics` antes de guardar la configuración global.
- El cálculo canónico de CE invalida referencias rotas o duplicadas y no usa costes copiados como fallback.
- Reglas del Sistema presenta menús explícitos para Etapas, Atributos Base, Estadísticas Derivadas, Límites y RD, y Mecánicas y Estamina.
- Etapas, Atributos Base y Mecánicas y Estamina ya tienen operaciones de guardado mediante `system_rules`.
- Las interfaces administrativas y la ficha pública reutilizan el sistema visual Cyberpunk y los componentes compartidos conforme a `AGENTS.md`.

### Parcial o transitorio

- Los efectos existentes en formato legado continúan almacenados como JSON flexible. Catálogo y Técnicas comparten ya el editor canónico para efectos nuevos y presentan los antiguos como pendientes de sustitución explícita.
- Las categorías mecánicas solo ofrecen `defaultTarget: 'self' | 'enemy'`. Este valor es una sugerencia de creación, no el contrato completo de destinatarios.
- El campo legado `target` está sobrecargado: según el efecto representa un destinatario, atributo, estadística derivada, estado, moneda o regla.
- Las etapas actuales se editan por posición dentro de la lista y todavía necesitan IDs estables antes de convertirse en relaciones autoritativas.
- El menú de Estadísticas Derivadas existe y `system_derived` admite persistencia, pero la tabla visible todavía usa filas fijas y sus acciones de edición no están conectadas al editor.
- El menú Límites y RD existe como sección visible, pero todavía no administra ni persiste sus listas.
- La ficha pública ya tiene presentación, pero la resolución completa de posesiones persistidas está pendiente.

### Pendiente de trasladar o construir

- Tipos y validadores centrales todavía pendientes para `SystemElement`, `Requirement`, `Possession` y `ShopOffer`.
- Adaptador explícito de efectos actuales al nuevo contrato, con reporte de casos ambiguos.
- Motores puros de requisitos y de ejecución de efectos.
- Publicación y revisión de elementos del sistema.
- Resolución relacional de posesiones para fichas privadas, públicas y exportación.
- Sustitución final de los modelos legados congelados.

## Administración modular de Reglas del Sistema

Esta organización fue añadida después del plan original y queda confirmada como parte del contrato de ShadowApp. Reglas del Sistema debe presentar cinco secciones explícitas y estables en su menú:

1. Etapas de Personaje.
2. Atributos Base.
3. Estadísticas Derivadas.
4. Límites y RD.
5. Mecánicas y Estamina (CE).

No son categorías libres creadas por el administrador. Son módulos conocidos del sistema, cada uno con validación y forma de edición propias. El rol `admin` los administra y la API vuelve a comprobar ese permiso antes de guardar.

Todos se cargan desde PostgreSQL mediante `system_rules`. La clave identifica el conjunto estable y su `value` JSON contiene la lista estructurada. La UI mantiene una copia temporal únicamente durante la edición; después de guardar vuelve a cargar la regla persistida. Un error de carga bloquea la edición y nunca se sustituye por una lista vacía guardable.

### Etapas de Personaje

La lista `system_stages` define explícitamente las etapas disponibles y su orden. Una etapa tiene ID estable y configura, como mínimo:

- nombre y rango de edad;
- EXP y yenes iniciales;
- Salud, Estamina y defensas base;
- dado de daño base;
- puntos de atributos y máximo por atributo;
- máximos de habilidades por nivel;
- máximos de técnicas por nivel;
- máximo de rasgos y mínimo de debilidades.

El administrador puede crear, editar y retirar etapas desde este menú. El orden mecánico no depende del nombre visible: se conserva mediante IDs y criterios estructurados. Los rangos de edad no deben solaparse y una etapa referenciada por personajes o requisitos no se borra físicamente sin comprobar sus relaciones; debe archivarse o sustituirse explícitamente.

Los valores de una etapa se aplican como valores iniciales durante CREATE. LOAD restaura la ficha persistida y UPDATE no recalcula ni reemplaza automáticamente sus valores porque la etapa haya cambiado.

### Atributos Base

La lista `system_attributes` contiene el conjunto estable de atributos base. Sus IDs mecánicos no cambian y no se identifican por nombre. El administrador puede editar los datos de presentación, incluidos nombre visible, abreviatura y descripción.

Editar una descripción o abreviatura cambia cómo se explica y presenta el atributo, pero no rompe fórmulas, efectos ni requisitos existentes. Crear o eliminar un atributo base requiere una modificación explícita del contrato y la validación previa de todas sus referencias.

### Estadísticas Derivadas

La lista `system_derived` contiene Salud, Estamina, Evasión, Coraje, Modificadores, Iniciativa y las demás estadísticas derivadas confirmadas. Cada entrada tiene ID mecánico estable, nombre visible, descripción y fórmula o referencia de fórmula.

El administrador debe poder editar la descripción y la fórmula desde esta sección. Una descripción es narrativa y nunca se ejecuta. La fórmula pertenece a Reglas del Sistema, debe validarse antes de publicarse y debe ser la única fuente utilizada por ficha, combate, perfil público y exportación. Una expresión mostrada en la UI que no consume el motor se considera únicamente transitoria.

Cambiar una fórmula afecta resultados derivados futuros y debe mostrar qué consumidores dependen de ella. No debe sobrescribir campos persistidos durante hidratación; los consumidores calculan el valor en el momento definido por el dominio.

### Límites y RD

Esta sección administra dos listas explícitas:

```ts
interface SystemLimit {
  id: string;
  name: string;
  description: string;
  scope: string;
  minimum?: number;
  maximum?: number;
  unit?: string;
}

interface DifficultyRange {
  id: string;
  name: string;
  value: number;
  description: string;
}
```

Los límites representan máximos, mínimos o topes compartidos, como límites de modificadores, costes mínimos, descuentos máximos, atributos o cantidades permitidas. Cada consumidor referencia el límite por ID y no copia su número.

Los Rangos de Dificultad (RD) forman una escala administrable de valores con nombre y descripción. Técnicas, acciones, requisitos y resoluciones que utilicen RD deben referenciar una entrada por ID. El nombre puede cambiar sin alterar la relación.

`system_limits` es la fuente de verdad de la lista de límites y `system_difficulty_ranges` es la fuente de verdad de la escala de RD. Ambas claves guardan listas JSON validadas y cada entrada usa un ID único y estable. La implementación no debe esconder estas listas dentro de Mecánicas y Estamina ni introducir valores de RD codificados en componentes.

### Categorías Mecánicas y Coste de Estamina (CE)

La lista `system_mechanics` conserva las mecánicas y tablas de costes que existían en la administración anterior, por ejemplo Daño, Curación, Barrera, Estados, Duración, Área, Alcance, Bonos y Limitaciones.

Cada categoría mecánica declara:

- ID estable, nombre, descripción e icono;
- tipo lógico: ofensiva, defensiva, soporte, control, limitación o utilidad;
- ámbito: técnicas, objetos y/o acciones normales;
- destinatario efectivo, selección y mínimo/máximo de objetivos;
- resolución efectiva: ninguna, EVA, COR, RD o enfrentada;
- lista de opciones con ID, comportamiento ejecutable, valor semántico, timing, duración y CE.

Estas categorías configuran instancias reutilizables de los tipos cerrados de `MechanicalEffect`. Daño y Curación no crean motores arbitrarios: una opción elige un tipo cerrado y fija una sola vez sus dados, intensidad o valor. Catálogo y Técnicas guardan únicamente la referencia a esa opción.

CE significa Coste de Estamina. Nunca representa coste de diseño. El motor resuelve el ID de categoría y opción contra la versión persistida vigente; una referencia inexistente invalida la ejecución y no recupera silenciosamente comportamiento ni coste copiados.

## Alcance de estas etapas

### Etapa 1 — Congelación

Quedan congelados `ShopItem`, `ItemModifiers`, `InventoryItem` y los requisitos de texto libre. Solo reciben correcciones bloqueantes y adaptadores de transición. No se añaden nuevos campos mecánicos al editor de Tienda.

### Etapa 2 — Diseño

Esta etapa define contratos y casos de uso. No cambia por sí sola el esquema de PostgreSQL ni migra datos.

## Límites del sistema

```text
Reglas del Sistema
  └─ valores, tablas, límites y fórmulas configurables
        ↓
Motor mecánico
  └─ valida, calcula y explica efectos y requisitos
        ↓
Catálogo del Sistema
  └─ define elementos reutilizables y versionados
        ↓
Asignación / adquisición
  ├─ Tienda
  ├─ recompensas
  ├─ administración
  └─ creación de personaje
        ↓
Personajes / Técnicas / Combate / Perfil público / Foro
```

## Actores y casos de uso

En la aplicación actual, los casos de Administrador de reglas, Diseñador del sistema y Administrador de Tienda pertenecen al rol `admin`. Los casos de Revisor de personaje, asignación de recompensas y gestión de inventario pertenecen al rol `moderator`. La API aplica esta separación aunque la interfaz oculte el control correspondiente.

### Administrador de reglas

1. Crea o modifica una tabla o límite en Reglas.
2. El motor valida su forma y evita referencias rotas.
3. La vista previa muestra qué elementos utilizan la regla.
4. El cambio se publica explícitamente.

### Diseñador del sistema

1. Crea un elemento del catálogo y elige su clase.
2. Añade efectos mecánicos mediante formularios estructurados.
3. Añade requisitos mediante referencias estables.
4. El motor calcula coste y muestra una explicación trazable.
5. Guarda como borrador, valida y publica.

### Administrador de Tienda

1. Selecciona un elemento publicado.
2. Define moneda, precio, disponibilidad, stock y límites comerciales.
3. Publica o pausa la oferta sin modificar el elemento.

### Revisor de personaje

1. Abre una ficha.
2. El sistema resuelve sus referencias al catálogo.
3. Evalúa requisitos, límites, incompatibilidades y elecciones obligatorias.
4. Presenta cada resultado con la regla y el elemento que lo originaron.

### Jugador futuro

Este actor no tiene cuenta ni permisos en la versión actual. Se conserva para que el diseño relacional no bloquee una ampliación futura, pero ninguna ruta debe crear o autorizar jugadores todavía.

1. Consulta elementos permitidos para su personaje.
2. Compra o selecciona uno.
3. La operación crea una posesión vinculada al ID del elemento.
4. Notas y elecciones personales se guardan en la posesión, no en el catálogo.

### Combate

1. Obtiene las posesiones y técnicas del participante.
2. Resuelve sus definiciones publicadas.
3. Aplica activación, destinatario, duración, mantenimiento y disparadores.
4. Registra el resultado y el origen de cada efecto.

### Exportación al foro

1. Consulta personaje y elementos resueltos.
2. Renderiza nombres y descripciones desde el catálogo.
3. Publica resultados calculados con la misma versión del motor usada por el revisor.

## Contratos propuestos

El contrato ejecutable vigente de efectos y destinatarios está detallado en `docs/mechanical-effects-contract.md` e implementado en `src/domain/systemMechanics.ts`. Las definiciones resumidas a continuación conservan el contexto funcional del plan.

### SystemElement

Representa una definición reutilizable del sistema.

```ts
type SystemElementKind =
  | 'trait'
  | 'weakness'
  | 'skill'
  | 'equipment'
  | 'weapon'
  | 'ammunition'
  | 'consumable'
  | 'license'
  | 'permission'
  | 'certification'
  | 'character_resource'
  | 'attribute_upgrade'
  | 'technique_entitlement'
  | 'altered_status'
  | 'plus_ultra_effect'
  | 'crafting_material'
  | 'ingredient';

interface SystemElement {
  id: string;
  kind: SystemElementKind;
  name: string;
  description: string;
  icon?: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  effects: MechanicalEffect[];
  requirements: RequirementGroup;
  choices?: ElementChoice[];
  metadata?: Record<string, string | number | boolean>;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
```

`kind` determina qué secciones del editor aparecen, pero no crea motores distintos. `metadata` no puede contener mecánicas que deban ser interpretadas.

### MechanicalEffect

Unión discriminada: cada efecto tiene una forma conocida y validable.

```ts
type EffectTiming = 'passive' | 'on_activation' | 'on_hit' | 'on_critical' | 'after_effect' | 'turn_start' | 'each_turn' | 'on_fumble';
type TargetEntityKind = 'character' | 'npc';

interface EffectTargeting {
  allowedEntityKinds: TargetEntityKind[];
  relationship: 'self' | 'ally' | 'enemy' | 'any';
  selection: 'direct' | 'area';
  minTargets: number;
  maxTargets: number | null;
  overflowSelection?: 'highest_initiative' | 'lowest_initiative';
  targetingCostRuleId?: string;
}

type MechanicalEffect =
  | { id: string; type: 'attribute_modifier'; attributeId: string; amount: number; targeting: EffectTargeting; timing: EffectTiming }
  | { id: string; type: 'derived_stat_modifier'; statId: string; amount: number; targeting: EffectTargeting; timing: EffectTiming }
  | { id: string; type: 'damage'; damageRuleId: string; targeting: EffectTargeting; timing: EffectTiming }
  | { id: string; type: 'healing'; healingRuleId: string; targeting: EffectTargeting; timing: EffectTiming }
  | { id: string; type: 'barrier'; barrierRuleId: string; targeting: EffectTargeting; timing: EffectTiming }
  | { id: string; type: 'status'; statusElementId: string; targeting: EffectTargeting; timing: EffectTiming; durationRuleId?: string }
  | { id: string; type: 'turn_denial'; turnRuleId: string; targeting: EffectTargeting; timing: EffectTiming }
  | { id: string; type: 'immunity'; statusElementId: string; degree: 'full' | 'half'; timing: 'passive' }
  | { id: string; type: 'maintenance'; effectIds: string[]; maintenancePercentageRuleId: string; maintenanceRoundingRuleId: string; timing: 'each_turn' }
  | { id: string; type: 'activation_constraint'; constraintRuleId: string; constraint: ActivationConstraint };
```

Los efectos referencian reglas mediante IDs. No copian precios unitarios, porcentajes o descripciones de las tablas.

El valor afectado y quien recibe el efecto son datos distintos. Por ejemplo, `attributeId: 'RES'` identifica qué cambia y `targeting.relationship: 'ally'` identifica quién lo recibe. El campo legado `target` no puede continuar representando ambos conceptos.

`self` significa el personaje o NPC que porta o activa el efecto, no la cuenta autenticada. `area` es un modo de selección y no una relación. Un destinatario propio siempre exige selección directa y exactamente un objetivo; un máximo abierto solo se admite para un área cuyas reglas determinen los afectados.

El `targeting` de una Categoría Mecánica es la fuente de verdad vigente para sus referencias. `defaultTarget` se conserva solo como compatibilidad con categorías anteriores y no autoriza a Catálogo o Técnicas a copiar el target.

`ActivationConstraint` representa condiciones estructuradas como primer turno, preparación, consumo, enfriamiento, habilidad activa, repercusión, límite por Día/Escena/Partida, objetivo consciente, umbral, límite de absorción y rotura por pifia.

### Requirement

Debe servir para Catálogo, Tienda, empleo, técnicas y validación de personajes.

```ts
type Comparison = 'eq' | 'gte' | 'lte' | 'includes';

type Requirement =
  | { id: string; type: 'owns_element'; elementId: string; quantity?: number }
  | { id: string; type: 'attribute'; attributeId: string; comparison: Comparison; value: number }
  | { id: string; type: 'skill_level'; skillElementId: string; comparison: Comparison; value: number }
  | { id: string; type: 'stage'; stageId: string; comparison: 'eq' | 'gte' }
  | { id: string; type: 'age'; comparison: 'gte' | 'lte'; value: number }
  | { id: string; type: 'character_field'; fieldId: string; comparison: Comparison; value: string | number | boolean };

interface RequirementGroup {
  operator: 'all' | 'any' | 'none';
  requirements: Array<Requirement | RequirementGroup>;
}
```

Cada evaluación devuelve `passed`, código, mensaje y evidencias. Un requisito opcional con recompensa pertenece al contrato del empleo u oferta, no al requisito base.

### ShopOffer

Representa únicamente una oferta comercial.

```ts
interface ShopOffer {
  id: string;
  elementId: string;
  status: 'draft' | 'scheduled' | 'available' | 'paused' | 'ended' | 'archived';
  priceMode: 'single' | 'combined';
  prices: Array<{ currency: 'exp' | 'yen'; amount: number }>;
  discount?: OfferDiscount;
  globalStock: number | null;
  perCharacterLimit: number | null;
  acquisitionPolicy: 'unique' | 'limited' | 'stackable';
  requirements: RequirementGroup;
  grantsQuantity: number;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

La oferta no contiene efectos, descripción mecánica, bonos, daño ni estados.

### Referencias y posesiones

```ts
interface ElementPossession {
  id: string;
  characterId: string;
  elementId: string;
  quantity: number;
  selectedChoices?: Record<string, ElementChoiceValue>;
  choiceCorrections?: PersonalChoiceAudit[];
  notes?: string;
  acquiredFrom?: { type: 'shop' | 'admin' | 'reward' | 'creation'; referenceId?: string };
  acquiredAt: string;
}
```

Todas las relaciones nuevas usan IDs. Los nombres son presentación. Las elecciones personales pertenecen a la posesión.

## Ciclo de vida

- **Borrador:** editable y no asignable.
- **Publicado:** disponible para consumidores; cambios mecánicos incrementan `revision`.
- **Archivado:** no puede adquirirse de nuevo, pero sigue siendo consultable.
- **Borrado físico:** permitido durante el desarrollo para datos de prueba. En producción se limita a borradores sin referencias.
- **Oferta retirada:** no afecta al elemento ni a posesiones existentes.

Como el sistema aún no está activo, la primera implantación puede borrar y volver a sembrar datos de prueba. No se implementará compatibilidad ni migración histórica salvo que un dato se declare explícitamente necesario.

## Invariantes

1. Reglas contiene valores y fórmulas; Catálogo compone esas reglas; Tienda vende elementos.
2. Un valor mecánico tiene una sola fuente.
3. Ningún motor interpreta descripciones narrativas.
4. Ninguna relación nueva usa nombres como identidad.
5. Los efectos inválidos impiden publicar; no reciben valores por defecto silenciosos.
6. LOAD restaura; CREATE aplica valores iniciales; UPDATE modifica campos explícitos.
7. Una compra guarda oferta, posesión, moneda, stock y auditoría atómicamente.
8. El motor es independiente de React, PostgreSQL y las rutas HTTP.
9. Las interfaces nuevas del núcleo reutilizan los componentes shadcn y las primitivas Radix instaladas; no crean controles visuales paralelos con HTML y estilos locales cuando existe un componente compartido equivalente.

## Definiciones confirmadas

### Estados alterados

Los estados alterados son `SystemElement`. Cada estado, como Veneno o Quemadura, tiene identidad propia y puede declarar sus efectos, duración, requisitos y reglas de acumulación. Técnicas, armas, consumibles, inmunidades y resistencias deben referenciar el estado mediante su ID; no deben copiar su definición ni identificarlo por nombre.

### Atributos y estadísticas derivadas

Los atributos y las estadísticas derivadas tienen IDs mecánicos estables y nombres visibles editables. Cambiar, por ejemplo, Fuerza por Potencia o Destreza por Maestría no cambia su identidad, sus referencias ni su comportamiento.

Las fórmulas de las estadísticas derivadas pertenecen a Reglas del Sistema y pueden editarse para aplicar ajustes de equilibrio. Los efectos y requisitos referencian atributos y estadísticas mediante sus IDs, nunca mediante el nombre visible.

La primera versión utiliza el conjunto actual de atributos. El modelo permite añadir otros en el futuro, pero su publicación debe validar las fórmulas, límites y referencias que dependan de ellos. Un atributo o estadística referenciado no puede borrarse; debe archivarse o reemplazarse de forma explícita.

### Revisión vigente de los elementos

Todos los personajes usan siempre la definición vigente de cada `SystemElement`. Cuando se corrige o equilibra un rasgo, habilidad, arma u otro elemento, el cambio se aplica automáticamente a todas las posesiones que referencien su ID. No se conservan reglas mecánicas diferentes según la fecha de adquisición.

Cada publicación incrementa la revisión y conserva un historial de cambios para auditoría. Ese historial permite conocer qué cambió, pero no fija revisiones antiguas en las fichas. Una modificación debe publicarse de forma explícita y validarse antes de convertirse en la definición activa para todos los personajes.

### Acumulación y límites de modificadores

Los modificadores numéricos procedentes de elementos diferentes se suman. El mismo elemento no se acumula consigo mismo, salvo que su efecto declare expresamente otra política. Los estados alterados definen individualmente cómo reaccionan ante aplicaciones repetidas, por ejemplo impedir la aplicación, reemplazarla, renovar su duración, extenderla o mantener instancias independientes.

Después de acumular bonos y penas, el sistema limita el modificador efectivo al máximo positivo y negativo definido en Reglas del Sistema. Por ejemplo, con límites de `+7` y `-1`, un total acumulado de `+9` se aplica como `+7` y uno de `-3` se aplica como `-1`.

Los límites son valores configurables y se asocian a la estadística, tirada o contexto correspondiente. La ficha puede conservar el total teórico para explicar sus fuentes, pero los cálculos utilizan el total efectivo limitado.

### Orden de cálculo

El motor aplica primero los multiplicadores al valor base indicado. Después suma los bonos y las penas válidos y limita ese modificador acumulado según los máximos definidos en Reglas del Sistema. Finalmente aplica, cuando corresponda, los límites propios del resultado.

El orden general es: valor base, cambios permanentes del valor base, reemplazos explícitos, multiplicadores, suma de bonos y penas, límite del modificador acumulado y límites del resultado final. Los multiplicadores no amplifican los bonos ni permiten superar sus límites.

Cada fórmula puede declarar su método de redondeo. Cuando no exista una regla particular, el resultado se redondea hacia abajo.

### Catálogo inicial de elementos

El catálogo inicial del sistema contiene rasgos, debilidades, habilidades, equipo, armas, munición, consumibles, licencias, permisos, recursos de personaje, mejoras de atributos, derechos de técnica, estados alterados, efectos Plus Ultra, materiales de creación e ingredientes.

`Recurso de personaje` representa acreditaciones, entrenamientos, contactos, accesos, influencia o conocimientos que no pertenecen al sistema de habilidades. `Derecho de técnica` habilita crear un espacio de técnica o modificar una técnica existente; la técnica resultante permanece como entidad propia del módulo de Técnicas. Los puntos Plus Ultra son una moneda del personaje y los efectos Plus Ultra son elementos no vendidos que consumen esa moneda al usarse.

Materiales e ingredientes son clases distintas: los materiales se usan con Tiradas Sostenidas para crear equipo, armas, vehículos o munición; los ingredientes se usan en tiradas contra Rango de Dificultad para crear comida, medicinas y otras sustancias consumibles.

La lista es el catálogo inicial estable. Pueden incorporarse clases nuevas en el futuro mediante una modificación explícita del contrato; las categorías y etiquetas administrativas no crean clases mecánicas ni motores paralelos.

### Habilidades, niveles y compras

Una habilidad es un `SystemElement` reutilizable. El nivel pertenece a la relación entre el personaje y la habilidad. Una habilidad no adquirida equivale a nivel cero y no aparece en la ficha; al comprar el nivel uno se crea la relación.

Cada nivel proporciona actualmente `+1` a la tirada correspondiente. El máximo y el valor inicial de compra se consultan en Reglas del Sistema. El coste del siguiente nivel es `valor inicial × max(1, nivel actual)`: con valor inicial 100, los niveles 1 a 5 cuestan respectivamente 100, 100, 200, 300 y 400 EXP.

Toda adquisición consume EXP, incluida la creación inicial del personaje. La operación descuenta la experiencia, crea o actualiza el nivel y registra la compra conjuntamente. Los futuros efectos particulares de una habilidad se expresan como `MechanicalEffect` y pueden exigir un nivel determinado.

### Destinatarios de efectos

Los efectos pueden tener como destinatarios personajes o NPCs. Cada técnica, arma, objeto o efecto declara qué clases de entidad admite, su relación con quien lo activa y si la selección es directa o por área.

La definición también establece el mínimo y máximo de destinatarios. Un efecto individual utiliza un máximo de uno; los efectos que permitan varios objetivos declaran su límite, y un valor abierto solo se admite cuando las reglas del área determinen los afectados. El motor valida la selección antes de activar y aplica el mismo efecto a cada destinatario válido.

Cuando existen más destinatarios válidos que el máximo del efecto, la selección se resuelve mediante Iniciativa. Un efecto que afecte a una cantidad limitada de aliados elige a quienes tengan la Iniciativa más alta; uno que afecte a una cantidad limitada de enemigos elige a quienes tengan la Iniciativa más baja. Por ejemplo, si el límite es tres y hay cuatro candidatos, se ordenan por Iniciativa y se seleccionan los tres primeros según el criterio correspondiente.

Se utiliza la Iniciativa de la ronda actual. Si todavía no existe una tirada válida en esa ronda, se utiliza la de la ronda anterior.

Los empates en la posición de corte se resuelven con la siguiente jerarquía:

1. Resultado natural del dado de Iniciativa, sin su modificador: se favorece el mayor para aliados y el menor para enemigos.
2. Velocidad: se favorece la mayor para aliados y la menor para enemigos.
3. Si ambos valores también coinciden, el destinatario se elige al azar entre quienes continúen empatados.

Por ejemplo, dos resultados totales de Iniciativa de 6 pueden proceder de `4 + 2` y `2 + 4`. Para un efecto sobre aliados se prioriza el resultado natural 4; para un efecto sobre enemigos se prioriza el resultado natural 2.

Si la escena no tiene una tirada de Iniciativa válida en la ronda actual ni en la anterior, los destinatarios se ordenan por su modificador de INI. En caso de empate se utiliza Velocidad y, si también coincide, se elige al azar. En toda la jerarquía se favorecen los valores mayores para aliados y los menores para enemigos.

#### Transición desde los efectos actuales de ShadowApp

La conversión depende del tipo del efecto y nunca del nombre visible:

- `modify_attribute.target` se convierte en `attributeId`.
- `modify_derived.target` se convierte en `statId`.
- `apply_status.target` se convierte en `statusElementId`.
- `grant_currency.target` se convierte en `currencyId`.
- `system_override.target` se convierte en `ruleId`.
- `recover_stat.target` se convierte en el ID del recurso recuperado y su antiguo `recipient` se adapta a `targeting.relationship`.
- `deal_damage.target` solo se adapta como relación cuando contiene `self`, `ally` o `enemy`; el antiguo valor `area` se adapta a `targeting.selection: 'area'`, no a una relación.

La Categoría Mecánica resuelve el target de todas sus referencias nuevas. Si el destinatario de un efecto legado es ambiguo, el adaptador conserva el JSON original, informa el problema y bloquea su publicación en el nuevo contrato hasta que un administrador lo sustituya explícitamente.

### Orden de disparadores de una acción

Una acción se resuelve en este orden:

1. Se declara la acción, sus destinatarios y los recursos utilizados.
2. Se valida y resuelve la Tirada de Acción como fallo, impacto, crítico o pifia.
3. Si existe un crítico, se aplican primero sus modificaciones: el crítico potencia o transforma los efectos antes de resolver el efecto principal.
4. Se resuelve el efecto principal ya modificado, como daño, curación, barrera, bono o pena.
5. Si la acción impactó, se aplican después los Estados Alterados vinculados al impacto.
6. Se resuelven las consecuencias posteriores, como reacciones al daño, rotura, contraataques o efectos que indiquen «después de impactar».
7. Se registran las duraciones, recurrencias y obligaciones de mantenimiento resultantes.

Un fallo no aplica daño ni Estados Alterados que requieran impacto. Una pifia o doble 1 resuelve la consecuencia correspondiente después de determinar el fallo. Los Estados Alterados no modifican retroactivamente el ataque que los aplicó.

### Duración y procesamiento de efectos temporales

Cada efecto temporal declara su duración y unidad: turnos, rondas o escenas. Cuando la unidad es turno, el efecto se procesa al inicio del turno de la entidad afectada. En ese momento se aplican el daño o curación recurrentes, los Estados Alterados, los bonos, las penas y otros modificadores temporales, y avanza su duración.

Los efectos medidos en rondas avanzan en el límite de ronda y los medidos en escenas cuando el Narrador concluye la escena. La definición del efecto determina su unidad; la duración no se interpreta a partir de su descripción narrativa.

### Consumo e interrupción de consumibles

Un consumible se descuenta cuando el personaje realiza la Tirada de Acción necesaria para usarlo. Se consume tanto si la tirada tiene éxito como si falla. Si la acción es interrumpida antes de realizar la tirada, el objeto no se descuenta.

El descuento y el registro de la tirada forman una operación conjunta. Una reacción o consecuencia posterior no devuelve el consumible aunque reduzca, cancele o modifique su efecto.

### Estado del equipo y las armas

Un objeto poseído está asignado al personaje. Si no está equipado, debe ocupar una ranura de almacenamiento disponible. Su mera posesión no activa efectos: debe declararse su uso o equiparse según las reglas del objeto.

Un objeto equipado aplica sus efectos pasivos mientras permanezca equipado. Equipar y desequipar son transiciones explícitas, por lo que tener un objeto en el inventario no equivale a llevarlo equipado.

`Activado` solo aplica a objetos que requieren encenderse, accionarse o alternar su funcionamiento, como determinados gadgets. Es un estado opcional dentro de un objeto equipado: sus efectos de activación comienzan después de completar la acción y la tirada requeridas. El equipo que no exija activación funciona al equiparse y no utiliza este estado.

Un objeto roto permanece en el inventario, pero no puede equiparse, activarse ni utilizar sus efectos. La rotura desactiva inmediatamente cualquier efecto que estuviera produciendo.

`Reparable` no es un estado, sino una propiedad futura que indicará si un objeto roto puede recuperarse y mediante qué proceso. La primera versión conserva el estado roto y deja el motor de reparación fuera del alcance hasta que se definan sus materiales, requisitos, costes y tiradas.

### Ranuras de equipo y capacidad de carga

Las ranuras corporales iniciales son Cabeza, Cuerpo, Guantes, Botas, Brazaletes, Cinturón y Mochila. Guantes, Botas y Brazaletes representan un par y cada categoría admite inicialmente un objeto. Las ranuras tienen IDs estables, nombres visibles editables y capacidades definidas en Reglas del Sistema.

El personaje también tiene Mano principal y Mano secundaria. Puede sostener un objeto en cada mano; un arma sostenida cuenta como equipada. Las manos son independientes de la ranura Guantes, de modo que llevar guantes es compatible con sostener armas. Un objeto de dos manos ocupa ambas ranuras simultáneamente.

El personaje no tiene capacidad básica de inventario. Su capacidad de almacenamiento procede exclusivamente de objetos equipados que concedan espacios:

- Una mochila ocupa la ranura Mochila y concede su propia capacidad.
- Un cinturón puede conceder una ranura para un accesorio o consumible. Se identifica como ranura de uso rápido, pero la primera versión no le aplica todavía ventajas de velocidad o economía de acciones.
- Un traje equipado en Cuerpo puede conceder una ranura de bolsillo para un accesorio o consumible.

Un objeto guardado en una mochila, cinturón o bolsillo no cuenta como equipado y no aplica efectos pasivos. Los accesorios son una categoría de Equipo, no una clase mecánica adicional. Un objeto solo puede ocupar una ubicación a la vez: una ranura corporal, una mano o una ranura de almacenamiento.

Una operación de desequipado se bloquea si dejaría objetos sin una ubicación válida. Los objetos rotos continúan ocupando su ranura hasta que se desequipen o trasladen.

### Elecciones personales de elementos

Algunos elementos requieren una elección personal para completar su adquisición. La elección se guarda en la posesión del personaje y no altera la definición compartida del `SystemElement`. La adquisición no puede completarse mientras falte una elección obligatoria o su valor no sea válido.

La elección queda fijada al adquirir el elemento. El jugador no puede modificarla posteriormente ni intercambiarla por otra; por ejemplo, Talentoso vinculado a Fuerza permanece vinculado a Fuerza. El administrador puede corregir un error de captura, pero la corrección debe conservar quién la realizó, cuándo, el valor anterior, el nuevo valor y el motivo. Esta vía no representa una reasignación permitida al personaje.

Las elecciones se guardan mediante IDs y estructuras mecánicas, no dentro de descripciones narrativas:

- Talentoso selecciona el ID de un atributo.
- Obsesión selecciona el ID de un personaje o NPC existente. Su condición se cumple cuando esa entidad participa en la escena actual.
- Trauma selecciona una manifestación mecánica. Los disparadores iniciales contemplan obtener una pifia, recibir un Estado Alterado específico referenciado por ID o alcanzar un umbral de Salud, como quedar a la mitad o menos.

El disparador elegido para Trauma se evalúa mediante el motor de reglas. Los umbrales se almacenan como valores estructurados y la comparación exacta forma parte de la configuración; no se intenta interpretar texto escrito por el usuario.

### Incompatibilidades de construcción y equipo

La construcción permanente del personaje y el conjunto de objetos equipados no pueden contener contradicciones mecánicas directas. Son incompatibles, por ejemplo, una inmunidad y una debilidad al mismo efecto, un bono y una pena directos sobre la misma estadística, o una resistencia y una vulnerabilidad al mismo Estado Alterado.

También se prohíben contradicciones por dependencia. Si un elemento aumenta directamente una estadística derivada, el mismo elemento u otro elemento simultáneo no puede reducir un atributo utilizado para calcularla. Por ejemplo, un bono de Salud es incompatible con una pena de Salud o Resistencia cuando Salud depende de Resistencia; un bono de Estamina es incompatible con una pena de Destreza cuando Estamina depende de Destreza.

El motor obtiene estas dependencias de las fórmulas vigentes en Reglas del Sistema. La validación se realiza al publicar un elemento, construir o revisar una ficha y equipar un objeto. Las incompatibilidades permanentes entre dos elementos son simétricas; los conflictos de ranura se validan por separado.

Esta prohibición solo se aplica a rasgos, debilidades y demás elecciones permanentes, además del equipo simultáneamente equipado. Los Estados Alterados, ataques y otros efectos temporales pueden aplicar penas aunque exista un bono permanente relacionado, salvo que una inmunidad u otra regla específica lo impida.

### Composición de mecánicas reutilizables

Todo `MechanicalEffect` se define como opción reutilizable en Reglas del Sistema. La categoría contiene destinatarios, cantidad, resolución y ámbitos; la opción contiene el comportamiento, valor, timing, duración y CE de ejecución.

Una opción pasiva siempre tiene CE 0 porque existe permanentemente en su portador. Una opción activa puede aportar CE cuando se ejecuta dentro de un ámbito habilitado por su categoría.

Tienda, Técnicas y Catálogo solo componen referencias. No vuelven a capturar dados, cantidades, targets, resoluciones ni CE y no convierten un componente desconocido en coste cero.

### Costes de Estamina por ejecución

CE es el Coste de Estamina que paga el personaje al ejecutar una acción. `stamina_execution_costs` configura el mínimo de acción básica, uso de objeto, técnica por nivel y habilidad activa por nivel. El coste final es el mayor entre ese mínimo y la suma de las opciones mecánicas activas habilitadas; el mínimo no se suma otra vez.

- Una técnica respeta el mínimo de su nivel y la suma de sus opciones activas.
- Una habilidad activa respeta el mínimo de su nivel y la suma de sus opciones activas.
- Un objeto utilizado respeta el mínimo de objeto y la suma de sus opciones activas; equipar o portar un pasivo no cobra CE.
- Una acción común respeta el mínimo base y la suma de sus opciones activas.
- Los efectos Plus Ultra consumen puntos Plus Ultra según su definición.

La interfaz muestra el CE que pagará el personaje y su desglose por regla base y opciones mecánicas.

### Coste mínimo de acciones y límites de técnicas

Toda acción realizada en un turno que requiera una Tirada de Acción tiene un coste mínimo total de 1 punto de Estamina. Este mínimo forma parte del coste final de la acción y no se suma nuevamente cuando la técnica, arma u objeto ya tenga un coste mayor. Por ejemplo, golpear con los puños cuesta 1 punto de Estamina.

Las Tiradas de Salvación no consumen Estamina por defecto, salvo que su regla indique expresamente un coste. Un consumible que requiera Tirada de Acción respeta el mínimo de 1; uno que no requiera esa tirada puede tener coste nulo según su definición.

Los costes base de técnicas y habilidades se guardan por nivel en `stamina_execution_costs`. No se codifican en sus formularios. El golpe básico parte de 1 CE mientras esa sea la regla publicada.

Los `categoryId` pertenecen a un catálogo estructural seleccionable; no se capturan como texto libre y quedan fijos después de publicar. Las reglas `stage` guardan por separado su orden, edad mínima y edad máxima. La etapa se resuelve directamente desde la edad: Novato 15–17, Emergente 18–24, Élite 25–30, Veterano 31–40, Emblema 41–50 y Leyenda desde 51.

### Conversión de CE a Rango de Dificultad

Las técnicas de Soporte y Defensa consultan la tabla vigente de CE a RD: CE de 1 a 3 corresponde a RD 12; CE de 4 a 6, RD 16; CE de 7 a 10, RD 20; y CE superior a 10, RD 24. Los rangos, etiquetas y valores se editan en Reglas del Sistema y sus consumidores no mantienen copias locales.

`RD` significa exclusivamente Rango de Dificultad. `RED` significa exclusivamente Reducción de Daño. Los modelos, reglas, etiquetas y nuevas implementaciones deben usar estas abreviaturas sin intercambiarlas; los usos heredados ambiguos deberán corregirse al migrar cada módulo.

### Limitaciones configurables

Las limitaciones son definiciones estructuradas y editables desde Reglas del Sistema. El administrador puede crear nuevas combinando disparadores, condiciones, consecuencias y parámetros conocidos por el motor. Su descripción explica la regla, pero no se interpreta para ejecutarla.

El catálogo inicial conserva estas limitaciones y descuentos: consumir un turno para activar, `-1`; consumir algo, `-1`; esperar dos turnos antes de repetir, `-2`; hablar directamente al objetivo, `-1`; requerir otra habilidad activa, `-2`; recibir un punto de daño por turno activo, `-1`; recibir dos puntos de daño, `-1`; recibir la mitad del daño provocado, `-4`; recibir `-2 INT` durante tres turnos al finalizar, `-3`; recibir `-2 DES` mientras esté activo, `-2`; limitar el uso a una vez por Día, Escena o Partida, `-4`; recibir `-2 INT` cada turno activo, `-1`; exigir que el objetivo esté consciente, `-2`; adquirir Sobrecalentado al quedar con 5 de Estamina o menos, `-3`; y absorber un máximo de 6 de daño, `-3`.

El momento de una repercusión es configurable. Cuando una limitación de daño propio no indique otro momento, el daño se aplica después de resolver el efecto principal, siempre que ninguna regla lo anule.

Los requisitos de contacto auditivo, físico y visual se retiran del catálogo inicial porque no se cuantifican de manera fiable en el motor. Podrán reconsiderarse cuando exista una representación mecánica verificable.

Los descuentos compatibles se suman, pero nunca reducen una técnica por debajo del mínimo de 1 CE. El motor bloquea duplicados, valida que la limitación restrinja realmente el efecto y muestra el desglose. Internamente el descuento se guarda como magnitud positiva y la interfaz lo presenta como resta.

La activación exclusiva durante el primer turno y la rotura por pifia forman parte del catálogo de limitaciones con un descuento inicial de `0 CE`. Sus consecuencias mecánicas se aplican aunque no reduzcan el coste. Como el resto de valores, ambos descuentos se administran desde Reglas del Sistema y pueden cambiar en futuros ajustes de equilibrio sin modificar los consumidores.

El descuento acumulado de limitaciones tiene un máximo vigente de `5 CE`, configurable en Reglas del Sistema. Por ejemplo, limitaciones individuales de `-1`, `-2` y `-4` suman `-7`, pero el descuento efectivo es `-5`. Después de aplicar el límite de descuento, la técnica todavía debe respetar su coste mínimo de 1 CE.

Los requisitos de adquisición, como poseer una habilidad o licencia, no reducen CE aunque se combinen. Solo las limitaciones verificables que restrinjan o perjudiquen el uso participan en el descuento, y únicamente se acumulan cuando son independientes.

### Mantenimiento de combinaciones recurrentes

Como regla general, una técnica no puede combinar efectos recurrentes de naturalezas incompatibles. Daño Activo y Curación Activa no pueden coexistir porque una técnica no puede ser simultáneamente ofensiva y de soporte. El editor debe impedir esa combinación antes de calcular o guardar la técnica.

Cuando exista una combinación recurrente válida, el mantenimiento de cada efecto se calcula individualmente mediante su coste unitario y el redondeo configurado; después se suman los resultados de los efectos que continúen activos. No existe mantenimiento independiente: el personaje paga el total del paquete o terminan todos sus efectos recurrentes.

### Estructura temporal de una Partida

`Partida` es el término general y reemplaza a `Misión` en las reglas compartidas. Una Partida puede ser de tipo Misión, Hazaña, Entrenamiento u otro tipo configurado, con sus propias recompensas y dificultades.

Cada Partida registra sus días on-rol. En una Partida de varios días, cada escena se vincula al día on-rol en que ocurre. El Narrador controla explícitamente el ciclo de vida de las escenas y rondas: puede abrir y cerrar una escena, y abrir y cerrar cada ronda dentro de ella.

Los límites de uso utilizan uno de tres ámbitos: Día, Escena o Partida completa. El motor registra el consumo contra el ID de la Partida, el ID de la escena o el día on-rol correspondiente y restablece la disponibilidad únicamente al cambiar el ámbito aplicable.

### Monedas y precios de ofertas

Como regla general, la EXP se utiliza para elementos que forman parte de la progresión del personaje, como atributos, habilidades, rasgos y derechos de creación o modificación de técnicas. Los yenes se utilizan para objetos, como equipo, armas, munición, materiales y consumibles.

La regla general propone la moneda al crear la oferta, pero no la impone. Cada oferta permite configurar si cobra EXP, yenes o ambas conjuntamente. Por ejemplo, una licencia puede exigir EXP para representar la progresión y yenes para cubrir su coste oficial. La interfaz muestra cada componente antes de confirmar y la compra cobra todos los componentes requeridos en una sola operación.

### Stock global y límites individuales

El stock de una oferta es global. Si existen 20 unidades y un personaje compra una, quedan 19 para todos los demás. El descuento de stock, el cobro y la entrega se guardan conjuntamente para impedir que una misma última unidad se venda más de una vez.

El límite por personaje es independiente y depende de lo adquirido. Un rasgo solo puede comprarse una vez; una debilidad solo puede solicitarse una vez; una medicina u otro elemento acumulable puede comprarse varias veces. Cada oferta declara una política de adquisición única, cantidad máxima o cantidad sin límite. Las reglas de unicidad del elemento también se validan cuando se concede fuera de la tienda.

Una oferta puede combinar stock global y límite individual, y cualquiera de ambos puede ser ilimitado cuando corresponda.

### Recompra, devolución, regalos y transferencias

Un elemento de adquisición única no puede volver a comprarse para sustituir su definición o una elección personal. Por ejemplo, un personaje no puede comprar Trauma nuevamente para eliminar su manifestación anterior o elegir otro detonante. Esta prohibición no afecta las compras repetidas de elementos acumulables, como medicinas o munición, dentro de sus límites.

No se permiten devoluciones ni reembolsos de elementos adquiridos. Tampoco se permite transferir a otro personaje un elemento que ya se encuentre en una posesión o inventario.

Un regalo es una compra nueva pagada por el personaje que lo envía y entregada directamente al personaje destinatario; no es una transferencia. La operación valida los requisitos y límites del destinatario, descuenta el stock global, cobra al remitente y registra la nueva posesión conjuntamente.

Cada personaje remitente puede realizar un máximo de tres regalos por mes calendario de tiempo real. El destinatario debe pertenecer a una cuenta de jugador diferente: dos personajes controlados por la misma cuenta no pueden regalarse entre sí. Por ejemplo, si Gato controla a Izuku y Momoka, Momoka no puede regalarle un elemento a Izuku.

Esta regla queda diferida mientras ShadowApp no tenga cuentas de jugador. No debe simularse asignando propiedad a cuentas `admin` o `moderator`.

El contador conserva mes real, personaje remitente, cuenta propietaria del remitente, personaje destinatario, cuenta propietaria del destinatario y oferta para auditoría. La comparación de propietarios y el consumo del cupo mensual forman parte de la misma validación atómica que el cobro, el stock y la entrega.

En una etapa futura, los personajes capaces de crear objetos podrán administrar sus propias tiendas. El diseño de tiendas de personajes, publicación de productos, ingresos, comisiones y stock creado queda fuera del alcance de la primera versión del núcleo.

### Ofertas temporales, descuentos y paquetes

Una oferta puede programar su disponibilidad mediante fechas de inicio y finalización de tiempo real y la zona horaria de la aplicación. Puede estar programada, activa, pausada, finalizada o archivada. Pausarla o finalizarla impide nuevas compras sin alterar las posesiones adquiridas.

Los descuentos pueden ser una cantidad fija, un porcentaje o un precio especial y declarar qué componentes del precio afectan. No se acumulan: una oferta solo puede tener un descuento activo en un mismo momento. El editor impide periodos superpuestos y el precio final nunca puede ser menor que cero.

Los paquetes de varios elementos no forman parte de la primera versión. Se conservan como ampliación futura y no se simulan mediante ofertas o entregas parciales.

### Concesiones administrativas sin oferta

Un administrador puede conceder directamente un elemento sin crear una oferta, cobrar una moneda ni reducir stock comercial. Esta vía sirve para recompensas, entregas narrativas, correcciones y elementos que no se venden. Toda concesión registra actor, destinatario, elemento, cantidad, motivo, origen, fecha y Partida relacionada cuando corresponda.

La concesión normal respeta requisitos, elecciones obligatorias, unicidad, incompatibilidades y límites. ShadowApp no tiene el rol Superadmin, por lo que actualmente ningún rol omite estos requisitos. Si se necesita una excepción administrativa, deberá definirse como una capacidad explícita, justificada y auditada antes de implementarla. Ninguna excepción futura podrá dejar una posesión incompleta o una construcción mecánicamente inválida.

## Definiciones que faltan o requieren confirmación

### Sistema

No quedan decisiones pendientes en esta sección.

### Juego

No quedan decisiones pendientes en esta sección.

### Reglas y costes

No quedan decisiones pendientes en esta sección.

### Tienda

No quedan decisiones pendientes en esta sección.

## Decisiones confirmadas para la primera versión

1. Clases iniciales cerradas; Admin administra categorías y etiquetas, no nuevos motores.
2. Estados alterados como elementos del catálogo para poder referenciarlos por ID.
3. Atributos y estadísticas usan IDs estables, nombres editables y fórmulas administradas desde Reglas; el contrato permite añadir otros en el futuro.
4. La definición publicada vigente se aplica por igual a todos los personajes; las revisiones se conservan para auditoría, no para fijar reglas antiguas.
5. Los modificadores de fuentes diferentes se suman, respetan incompatibilidades y aplican después los límites configurados.
6. La duración declara su unidad y los efectos por turno se procesan al inicio del turno de la entidad afectada.
7. Moderator puede conceder elementos directamente mediante una operación auditada; ningún rol actual omite requisitos mecánicos.
8. Cada oferta configura EXP, yenes o ambas monedas conjuntamente según corresponda.
9. Los descuentos de ofertas no se acumulan y los paquetes quedan fuera de esta versión.
10. Reglas del Sistema conserva cinco módulos explícitos: Etapas, Atributos Base, Estadísticas Derivadas, Límites y RD, y Mecánicas y Estamina.
11. Los IDs de atributos base y estadísticas derivadas son estables; el administrador puede editar sus nombres visibles y descripciones, y las fórmulas derivadas se validan como reglas del sistema.
12. Límites y Rangos de Dificultad son listas administrables y referenciables por ID, con fuentes de verdad separadas en `system_limits` y `system_difficulty_ranges`.
13. Las Categorías Mecánicas como Daño y Curación definen opciones ejecutables reutilizables y su CE. Catálogo y Técnicas solo guardan referencias a ellas.

### Semántica del motor de requisitos

El motor recibe un grupo de requisitos, una vista en memoria del personaje y el orden vigente de las etapas. No consulta ni modifica PostgreSQL. Devuelve el resultado general y evidencia jerárquica para que la interfaz pueda explicar qué requisito aprobó o falló.

Los grupos permiten exigir todos (`all`), al menos uno (`any`) o ninguno (`none`) de sus requisitos y pueden anidarse. Un grupo vacío `all` o `none` aprueba; un grupo vacío `any` falla.

Una habilidad o posesión ausente equivale a nivel o cantidad cero, porque representa que el personaje no la posee. Un atributo, edad, etapa o campo general ausente produce un fallo explícito de datos incompletos y nunca se convierte silenciosamente en cero. Las etapas se comparan mediante el orden configurable recibido desde Reglas; toda referencia desconocida falla de forma explícita.

La evaluación conserva valores válidos como `0` y `false`, no altera sus entradas y no concede excepciones administrativas. La autorización y auditoría de una excepción pertenecen a la operación de concesión o compra que invoque este motor.

### Semántica del motor de efectos y costes

El motor numérico recibe el valor base, cambios permanentes, un reemplazo opcional, multiplicadores, bonos y penas, límites y redondeo. Aplica los pasos en el orden acordado y devuelve tanto el resultado como los valores intermedios para explicar el cálculo. Todos los límites y métodos de redondeo llegan desde Reglas del Sistema.

El Coste de Estamina se obtiene exclusivamente mediante la regla base del contexto y los IDs de opciones mecánicas aplicadas. Una referencia ausente o desconocida invalida el resultado y nunca se interpreta como cero. Las mecánicas pasivas aportan siempre CE 0.

El mantenimiento solo admite Daño Activo y Curación Activa recurrentes. Calcula cada efecto desde su coste unitario referenciado, aplica el porcentaje y redondeo configurados y finalmente suma el paquete. Una Barrera, un efecto no recurrente o un efecto sin coste resoluble invalida el cálculo. La decisión de pagar el paquete o terminarlo durante el turno pertenece al futuro ejecutor de combate; este motor únicamente produce el coste verificable.

## Secuencia después de aprobar definiciones

El orden siguiente corresponde al estado comprobado en ShadowApp. Las implementaciones terminadas en el repositorio anterior sirven como referencia, pero deben trasladarse y verificarse contra PostgreSQL antes de considerarlas completas aquí.

1. Convertir los contratos de este documento en tipos TypeScript compartidos, sin conectar todavía consumidores legados.
2. Implementar validadores puros y pruebas de contratos, incluido `EffectTargeting`.
3. Crear un adaptador de lectura de efectos legados que preserve datos ambiguos y los reporte sin inventar valores.
4. Definir el esquema relacional y la validación de API para elementos, revisiones, requisitos, efectos y posesiones.
5. Crear el motor puro de requisitos.
6. Completar el motor puro de efectos y costes. El cálculo actual de CE es solo una base parcial.
7. Migrar Reglas, Catálogo y Técnicas al contrato y editor compartidos.
8. Conectar posesiones, fichas privadas, ficha pública y exportación al mismo modelo resuelto.
9. Reemplazar la Tienda legada y verificar compras, stock, economía y entrega de forma atómica.
10. Retirar adaptadores únicamente después de auditar y preservar los registros existentes.

## Estimación histórica de referencia

- Congelación y contrato revisable: 8k–14k tokens.
- Tipos, validadores y pruebas del núcleo: 15k–25k.
- Motores de requisitos, efectos y costes: 25k–40k.
- Catálogo administrativo: 20k–35k.
- Tienda nueva y compras atómicas: 15k–25k.
- Reconexión de personajes, técnicas, combate y perfiles: 25k–45k.

La estimación original era de aproximadamente 108k–184k tokens. No debe utilizarse como trabajo restante de ShadowApp sin volver a estimar la adaptación a PostgreSQL, la auditoría de datos existentes y las partes ya implementadas.
