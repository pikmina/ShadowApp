# ShadowApp — Especificación de municiones

## Objetivo

Implementar la configuración, persistencia, disponibilidad, compatibilidad y consumo de municiones, integrándolas con el catálogo, el inventario, la API y los perfiles de personajes.

Antes de modificar código, auditar la implementación actual y adaptar esta especificación a los modelos y convenciones existentes sin duplicar sistemas.

## 1. Información del catálogo

Cada tipo de munición debe permitir configurar:

- **Nombre:** nombre identificativo.
- **Calibre:** calibre de la munición.
- **Compatibilidad:** tipos de armas compatibles, según el modelo actual de armas.
- **Balas por caja:** cantidad inicial de unidades individuales de munición.
- **Bono de daño:** modificador de daño aportado por la munición.

La descripción narrativa y cualquier icono o emoji de identificación deben seguir las convenciones del catálogo.

### Organización del formulario

**Información básica**
- Nombre.
- Descripción narrativa.
- Icono o emoji, si corresponde al diseño existente.

**Efectos mecánicos**
- Calibre.
- Compatibilidad con armas.
- Balas por caja.
- Bono de daño.

No duplicar campos mecánicos en ambas pestañas.

## 2. Distinción entre munición y cargador

Las balas por caja representan existencias de munición. No representan la capacidad del cargador de un arma.

Ejemplo:

- Caja inicial: 30 balas.
- Capacidad del arma: 5 balas.
- Disparos realizados: 5.
- Existencias restantes en la caja: 25 balas.

El arma puede tener una capacidad de cargador independiente. No debe confundirse con las existencias disponibles del personaje.

Cada disparo que consuma esta munición descuenta una unidad de las existencias correspondientes. La caja se considera agotada cuando las existencias llegan a cero.

No descontar una caja completa por disparo, recarga o uso del arma.

## 3. Persistencia e inventario

Auditar primero el modelo de datos existente y determinar cómo se representan:

- Las definiciones de munición del catálogo.
- Las unidades o cajas que posee cada personaje.
- Las existencias restantes de cada caja o unidad de inventario.
- La relación entre armas, municiones y personajes.

Mantener separados los datos de definición del catálogo y las existencias de cada personaje.

La cantidad inicial se obtiene de la configuración del objeto. El consumo modifica las existencias del inventario, no la definición global del catálogo.

Si el modelo actual representa cada adquisición como una caja independiente, preservar esa semántica. Si agrupa existencias, respetar el modelo existente y asegurar que el consumo sea correcto.

No introducir una segunda fuente de verdad para las existencias.

## 4. API

Auditar los endpoints, servicios, esquemas de validación y operaciones de persistencia involucrados.

Verificar que:

- Las operaciones administrativas puedan crear y editar los campos de munición.
- Las respuestas de API incluyan los datos necesarios para mostrar la munición y sus existencias.
- Las operaciones de inventario consulten y actualicen la cantidad correcta.
- El consumo no permita existencias negativas.
- No se acepte una munición incompatible con el arma cuando corresponda validar esa relación.
- Las modificaciones de existencias sean atómicas cuando exista riesgo de consumo concurrente.
- Se respeten los permisos y la validación de datos existentes.
- Los cambios de esquema se implementen mediante las migraciones del proyecto, si son necesarios.

No crear endpoints nuevos si los servicios existentes pueden cubrir el caso de uso correctamente.

No asumir nombres de rutas, tablas, campos o tipos antes de inspeccionar el repositorio.

## 5. Perfiles de personajes

Mostrar la cantidad restante de munición en el inventario visible del personaje, utilizando el componente o patrón de presentación existente.

La visualización debe permitir identificar:

- Nombre de la munición.
- Calibre.
- Compatibilidad o arma asociada, si corresponde.
- Balas restantes.
- Capacidad inicial de la caja, cuando resulte útil para el usuario.

Ejemplo: `Munición de 9 mm — 25/30 balas`.

La cifra debe proceder de las existencias persistidas, no de un cálculo visual temporal ni de la cantidad de balas que admite el cargador.

Actualizar la vista cuando el inventario cambie, siguiendo el mecanismo de actualización de datos de la aplicación.

No exponer identificadores internos ni valores técnicos innecesarios.

## 6. Integración con el combate

Localizar el punto canónico donde se procesa un disparo y se consume munición.

- Descontar exactamente una bala por cada disparo que consuma munición.
- No descontar balas por una acción que no llegue a producir un disparo, salvo que las reglas actuales indiquen explícitamente lo contrario.
- No descontar dos veces por un mismo disparo.
- Gestionar la falta de munición según las reglas existentes.
- Preservar los efectos y modificadores de daño ya implementados.
- Aplicar el bono de daño de la munición de acuerdo con las reglas vigentes, sin sumarlo dos veces.
- No confundir una recarga del cargador con la adquisición o el consumo de una caja completa.

Si el sistema todavía no tiene una integración de combate que pueda consumir munición, documentar la limitación y separar ese trabajo del formulario y la visualización, sin inventar una nueva mecánica paralela.

## 7. Validaciones

Verificar al menos:

- Nombre obligatorio según las convenciones existentes.
- Calibre válido.
- Compatibilidades válidas y existentes.
- Balas por caja como entero positivo.
- Bono de daño dentro de los límites admitidos por el sistema.
- Existencias restantes como entero no negativo.
- Rechazo de consumos superiores a las existencias disponibles.

Los límites concretos del bono y las convenciones de calibre deben derivarse de las reglas y validaciones existentes, no inventarse.

## 8. Pruebas y criterios de aceptación

- [ ] Crear y editar municiones desde el formulario administrativo.
- [ ] Guardar y recuperar todos los campos mediante la API.
- [ ] Persistir las existencias de cada personaje independientemente de la definición del catálogo.
- [ ] Verificar que una caja de 30 balas quede en 25 después de cinco disparos.
- [ ] Verificar que las existencias lleguen a cero sin valores negativos.
- [ ] Verificar que el agotamiento de una caja no altere la definición global de munición.
- [ ] Verificar que el cargador del arma y las existencias de la caja sean independientes.
- [ ] Mostrar las existencias reales en los perfiles.
- [ ] Verificar compatibilidad entre arma y munición.
- [ ] Comprobar que el bono de daño se aplique según las reglas vigentes y solo una vez.
- [ ] Ejecutar pruebas de regresión relevantes.
- [ ] Ejecutar lint y build.
- [ ] Actualizar `docs/ROADMAP.md` con el resultado comprobado.

## 9. Informe de implementación

Al terminar, informar brevemente:

1. Causa o estado inicial encontrado.
2. Archivos modificados y motivo.
3. Cambios en esquema, migraciones y API.
4. Cambios en formulario, inventario y perfiles.
5. Integración con el consumo en combate.
6. Pruebas ejecutadas y resultados.
7. Pendientes, limitaciones y siguiente paso.