# Contrato de Categorías Mecánicas y Coste de Estamina

Este documento es la referencia obligatoria para Reglas del Sistema, Catálogo, Técnicas y cualquier motor que ejecute efectos.

## Significado de CE

CE significa exclusivamente **Coste de Estamina**: los puntos de Estamina que paga un personaje al ejecutar una acción. No representa potencia, balance ni coste de diseño.

Una mecánica con timing pasivo existe permanentemente en su portador y siempre tiene CE 0. La API rechaza una opción pasiva con coste distinto de cero.

## Una sola fuente de verdad

system_rules/system_mechanics contiene las Categorías Mecánicas reutilizables. Cada categoría define:

- ID estable, nombre, descripción y clasificación visual;
- ámbitos permitidos: técnicas, objetos y acciones comunes;
- destinatario, modo de selección y mínimo/máximo de objetivos;
- resolución: automática, EVA, COR, RD o enfrentada;
- opciones mecánicas con ID estable.

Cada opción de tipo effect define una vez:

- el comportamiento cerrado que ejecuta el motor;
- su propiedad semántica, como statId, resourceId o dados;
- momento y duración;
- CE adicional de ejecución.

Una opción cost_modifier modifica CE sin inventar otro comportamiento. Sirve para excepciones explícitas. Nunca se interpreta una descripción humana para ejecutar lógica.

## Flujo de autoría

~~~text
Reglas del Sistema
  Categoría Daño
    target: 1 rival
    resolución: EVA
    opción: 2D8, on_hit, CE 3
          ↓ referencia estable
Técnica / elemento
  { applicationId, mechanicId: "damage", ruleId: "damage_2d8" }
          ↓ resolución en tiempo de uso
Motor
  daño 2D8 a 1 rival, contra EVA; cobra el CE aplicable
~~~

Catálogo y Técnicas no vuelven a capturar 2D8, target, cantidad, resolución o CE. Pueden agregar varias referencias para componer varios efectos.

El elemento persiste únicamente applicationId, mechanicId y ruleId. No persiste copias de nombre, descripción, dados, cantidad, target o coste. Una referencia rota invalida la resolución; nunca usa una copia o un valor cero como fallback.

## Tipos ejecutables cerrados

Las etiquetas “Ofensiva”, “Soporte” o “Daño” no ejecutan lógica. El comportamiento lo define effect.type, limitado a:

- attribute_modifier
- derived_stat_modifier
- damage
- healing
- barrier
- status
- currency
- rule_override
- choice

Así se evita que “Daño” y “Ofensiva” se conviertan en dos propiedades que reducen Salud.

## Coste por contexto

system_rules/stamina_execution_costs define los costes base:

- baseAction: acción o golpe básico;
- objectUse: uso activo de objeto;
- techniqueByLevel: coste base de técnica por nivel;
- skillByLevel: coste base de habilidad activa por nivel.

El coste de ejecución es el mayor entre el mínimo base del contexto y la suma de las opciones mecánicas activas habilitadas para ese ámbito. El mínimo no vuelve a sumarse cuando las opciones ya cuestan más. Los pasivos no aportan CE. La adquisición, el precio en yenes/EXP y las recompensas son conceptos separados.

## Compatibilidad y migración

Los efectos canónicos anteriores y los registros legados se conservan exactamente durante LOAD. No se convierten por nombre, descripción o categoría. El editor los identifica como anteriores y exige una sustitución explícita por referencias globales.

CREATE usa el contrato de referencias. UPDATE solo cambia lo editado. Cambiar una categoría global cambia la resolución vigente de sus referencias, por lo que sus IDs deben ser estables y los cambios publicados deben revisarse como reglas de sistema.

## Cambios coordinados

Agregar un tipo de efecto, dimensión de target o contexto de CE requiere modificar conjuntamente el contrato, el plan de arquitectura, los esquemas del dominio, la API, el editor de Reglas, el selector compartido y sus pruebas.
