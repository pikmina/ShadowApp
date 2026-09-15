# Contrato de remuneración de empleos

## Alcance inicial

`employment_compensation`, almacenada en `system_rules`, es la fuente de verdad de las bases de remuneración por nivel y de los adicionales por riesgo. Los puestos futuros guardarán únicamente los IDs estables del nivel y riesgo elegidos.

El cálculo es puro y no modifica personajes, empleos ni saldos:

```text
yenes = base del nivel + adicional de riesgo + bono de yenes
EXP   = base del nivel + adicional de riesgo + bono de EXP
```

Todos los valores son enteros no negativos. Un ID desconocido invalida el cálculo; no se utiliza un nivel o riesgo predeterminado como sustitución.

## Aprobación manual

`manualApprovalRequired` es siempre `true`. ShadowApp no agenda ni ejecuta pagos automáticamente. Cada pago individual o colectivo futuro comienza con una selección y confirmación explícitas de un moderador.

Los posts mínimos pertenecen al puesto y se verifican manualmente porque la actividad ocurre en el foro. El sistema futuro registrará el número observado, la aprobación y las notas del moderador; esta regla no intenta consultar el foro.

## Persistencia y cambios

La semilla de arranque crea la regla únicamente cuando falta. Nunca reemplaza valores ya persistidos. El editor carga el documento guardado, conserva cambios locales mientras está sucio y vuelve a hidratarse después de guardar.

Los pagos futuros conservarán un desglose inmutable de los importes usados, para que los cambios posteriores en estas tablas no alteren el historial.
