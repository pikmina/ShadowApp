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
