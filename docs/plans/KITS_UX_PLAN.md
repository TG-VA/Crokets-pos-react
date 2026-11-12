# Plan: mejoras de UX, validación y refactor en Promociones y Kits

Rama: `feat/kits-vigencia-por-fechas` (PR #186). Módulo:
`src/components/ProductsComponents/PageProducts/ProductsPromotions`.

Este documento es solo un plan. No contiene implementación. Ningún test se escribe hasta que se
pida. Las decisiones de la sección 2 y los 12 seams de la sección 3 están
confirmados; la única regla pendiente es la de duplicar kit (5a).

## 1. Estado verificado del código

- Ya está hecho y sin commitear: botón "Cancelar" gris al editar, mismo ancho para "Guardar kit" y
  "Actualizar kit" (`.btnSaveWide`), y bloqueo del guardado hasta completar los campos
  (`services/kitFormCompletenessService.js`).
- `isKitFormComplete(form, selectedProducts)` devuelve solo un booleano y exige `starts_on` y
  `ends_on`. La base de datos los trata como opcionales (NULL = sin límite). Ese es el conflicto
  del punto 4.
- `KitActionsSection.jsx` deshabilita "Guardar kit" sin explicar por qué.
- `handleClearForm` (botón "Limpiar") sí confirma antes de limpiar. `handleCancelEdit` es
  `resetForm` directo: "Cancelar" y la tecla Escape no confirman nunca, aunque haya cambios.
- `handleToggleKitStatus` ya usa `showAppConfirm` para activar y desactivar, y
  `handleSoftDeleteKit` también lo usa para eliminar. La confirmación antes de desactivar ya
  existe; solo se agrega una prueba que la proteja si el refactor la toca.
- `validateForm` (en `hooks/useProductsPromotions.js`) mezcla reglas de validación con llamadas a
  `showAppAlert`, y se duplica parcialmente con `isKitFormComplete`.
- `hooks/useProductsPromotions.js` tiene 499 líneas con cuatro responsabilidades: estado del
  formulario, selección de productos, persistencia (guardar, editar) y acciones de lista (activar,
  desactivar, eliminar).
- `useKitsList` usaba `KITS_PAGE_SIZE = 4` y `pageSizeOptions: [4]`, sin orden. Estado actual
  (rebanada 5d): `KITS_PAGE_SIZE = 10`, `pageSizeOptions: [5, 10, 20]` y selector de orden
  (vencimiento, descripción, precio, estado) vía `kitsSortService`. La tabla de productos
  seleccionados (`KitSelectedProductsSection`) conserva su paginación propia de tamaño fijo 7.
- `permissionsService.js` solo exporta `checkUserIsAdmin(userId)`. `AuthContext` no expone rol ni
  permisos. `admin` y `cajero` tienen los mismos permisos en la base de datos
  (`KNOWN_ISSUES.md` #13) y el gateo en cliente es un riesgo aceptado, no un control de seguridad
  (`PERMISSIONS.md`).

## 2. Decisiones tomadas

- (a) Fechas (puntos 1 y 4): ambas son opcionales. Cada campo tiene un botón "Sin límite" que
  limpia el valor y deshabilita el campo; volver a pulsarlo lo habilita. Una sola fecha es válida
  (solo inicio, o solo fin). La fecha de fin no puede ser anterior a la de inicio. NULL en la base
  significa sin límite, así que la UI queda alineada con el esquema.
- (b) Tamaño de página (5d): por defecto 10; opciones 5, 10 y 20.
- (c) Editar y eliminar (5f): solo administradores. Se resuelve con un hook `useIsAdmin` sobre
  `checkUserIsAdmin` de `permissionsService.js`. Es control de interfaz, no de seguridad. Sin
  migración ni permiso nuevo en la base de datos.
- (d) Aviso de vencimiento (5c): umbral de 3 días. Insignia en la fila y una franja sobre la
  lista que, al hacer clic, filtra los kits por vencer.
- (e) Orden (5e): por fecha de vencimiento, descripción, precio y estado.
- Eliminar (5f): modal que exige escribir `ELIMINAR` para habilitar el botón de confirmar.

Pendiente: la regla de duplicar kit (5a) sigue sin confirmar.

## 3. Seams para los tests (los 12 confirmados)

Una línea por seam: qué detecta y qué no.

1. `kitFormValidationService.validateKitForm(form, selectedProducts)` (servicio puro). Detecta
   reglas faltantes o mal ordenadas y mensajes incorrectos. No detecta que el hook muestre la
   alerta.
2. `kitFormCompletenessService.getMissingKitFields(form, selectedProducts)` (servicio puro).
   Detecta campos que faltan sin reportarse y la regla de fechas. No detecta cómo se pinta el
   mensaje.
3. `KitActionsSection` renderizado (componente). Detecta que el mensaje aparece con el botón
   bloqueado y desaparece al completar. No detecta el cálculo de los campos faltantes.
4. `useKitForm` con `renderHook` (hook). Detecta Escape y Cancelar con y sin cambios pendientes, y
   que `resetForm` solo corre tras confirmar. No detecta el estilo del modal.
5. `kitsSortService.sortKits(kits, criterion)` (servicio puro). Detecta orden incorrecto y
   estabilidad. No detecta la interacción con la paginación.
6. `useKitsList` (hook, ya tiene test). Detecta que ordenar o cambiar el tamaño reinicia la página.
   No detecta el aspecto visual del selector.
7. `kitValidityCalculationService.isKitExpiringSoon(kit, today, days)` (servicio puro). Detecta
   límites del umbral (día exacto, ya vencido, sin fecha). No detecta zona horaria si se usa
   `Date` real; por eso `today` se inyecta.
8. `kitMarginCalculationService.getKitMarginWarning(components, kitPrice)` (servicio puro).
   Detecta precio por debajo de la suma de componentes o del costo. No detecta el texto en
   pantalla.
9. `useKitListActions` (hook de acciones de lista). Detecta que duplicar, renovar vigencia,
   desactivar y eliminar piden confirmación y llaman al servicio correcto. No detecta SQL real.
10. `useIsAdmin` y el gate de editar y eliminar (decisión c). Detecta que un usuario no
    administrador no ve o no puede usar editar y eliminar, y que `checkUserIsAdmin` se consulta
    con el usuario correcto. No es un control de seguridad; así debe leerse el test.
11. `isDeleteConfirmationValid(text)` (función pura). Detecta que solo `ELIMINAR` habilita la
    confirmación (mayúsculas exactas, espacios sobrantes, vacío). No detecta el aspecto del modal
    ni que se llame al servicio de borrado.
12. Toggle "Sin límite" de las fechas (hook de formulario o componente de fecha). Detecta que
    activarlo limpia el valor y deshabilita el campo, y que desactivarlo lo habilita. No detecta
    el cálculo de campos faltantes ni la regla de rango (seams 1 y 2).

Regla: no se escribe ningún test fuera de estos seams, y cada test se escribe en rojo antes
que su implementación.

## 4. Orden de entrega: rebanadas verticales

Cada rebanada termina funcionando de punta a punta (servicio, hook, componente y test) y deja
`npm run check:agents`, `npm test`, ESLint y Prettier en verde.

### Rebanada 0. Cerrar lo pendiente sin commitear

- Alcance: revisar y commitear por separado lo ya hecho (botón Cancelar, ancho, bloqueo de
  guardado). Solo cuando el usuario lo pida. Nunca `git add -A` ni `.claude/`.
- No es objetivo: cambiar comportamiento.

### Rebanada 1. Mensaje de por qué el botón está bloqueado (punto 1)

- Criterios de aceptación:
  - Con el botón deshabilitado, bajo los botones se lista qué falta, por ejemplo "Falta: código de
    barras, precio, al menos un producto".
  - El mensaje desaparece cuando el formulario está completo.
  - El mensaje usa texto sin emojis y una clase de CSS Module, sin `!important`.
  - Decisión (a): las fechas son opcionales, por lo que nunca aparecen en la lista de faltantes.
- Cambios de interfaz: `kitFormCompletenessService.js` agrega `getMissingKitFields(form,
selectedProducts)` que devuelve un arreglo de etiquetas; `isKitFormComplete` pasa a ser
  `getMissingKitFields(...).length === 0` (misma firma pública, sin cambio para quien ya lo usa).
- Archivos: `kitFormCompletenessService.js` y su test, `useProductsPromotions.js` (expone
  `missingFields`), `ProductsPromotions.jsx` (pasa la prop), `KitActionsSection.jsx`,
  `ProductsPromotions.module.css`.
- No es objetivo: validar duplicados de código de barras antes de guardar.
- Tests: seams 2 y 3.

### Rebanada 2. Confirmar al salir con cambios sin guardar (punto 2)

- Criterios de aceptación:
  - Escape y "Cancelar" piden confirmación solo si hay cambios respecto al estado inicial (kit
    cargado al editar, o formulario vacío al crear). Sin cambios, cancelan directo.
  - "Limpiar" mantiene su confirmación actual.
  - Escape no actúa mientras hay un modal abierto ni mientras el buscador de productos está
    abierto (comportamiento actual, se conserva).
- Diseño: un detector de cambios sin guardar (`hasUnsavedKitChanges(initial, form,
selectedProducts)`) como función pura dentro de un servicio de formulario; el hook compara
  contra una copia inicial guardada al cargar el kit.
- Archivos: `useProductsPromotions.js` (o `useKitForm.js` si la rebanada 4 ya ocurrió), un
  servicio nuevo pequeño, tests.
- No es objetivo: avisar al cambiar de ruta de la aplicación (otro problema, otro alcance).
- Tests: seam 4.

### Rebanada 3. Resolver el conflicto de fechas (punto 4)

- Decisión (a): fechas opcionales.
  - `getMissingKitFields` deja de exigir `starts_on` y `ends_on`.
  - Cada campo de fecha lleva un botón "Sin límite" que limpia el valor y deshabilita el campo
    (seam 12). Una sola fecha es válida.
  - `validateKitDateRange` ya admite vacíos (verificar con su test antes de tocar) y rechaza
    fin anterior a inicio.
- Criterios de aceptación: la regla de completitud, la validación y el texto de ayuda dicen lo
  mismo. Un kit existente con fechas NULL se puede abrir y editar sin quedar bloqueado, y se
  muestra con los campos en "Sin límite".
- No es objetivo: cambiar el esquema ni aplicar migraciones al remoto.
- Tests: seams 1, 2 y 12.

### Rebanada 4. Refactor: validación pura y división del hook (punto 3)

Frontera de preservación de comportamiento (se define antes de mover nada):

- Mismo orden de validación: código, descripción, precio, límite, vigencia, productos, cantidades.
- Mismos títulos y mensajes de alerta, mismo tipo `warning`.
- Mismo flujo de guardado: validar, verificar duplicados, crear o actualizar, alerta de éxito,
  `resetForm`, `loadKits`; mismo manejo de error con `console.error` y alerta `danger`.
- Mismas confirmaciones de limpiar, activar, desactivar y eliminar.
- Misma interfaz pública de `useProductsPromotions` mientras `ProductsPromotions.jsx` la consume.

Pasos, uno por frontera de propiedad, cada uno con la suite completa en verde antes y después:

1. Caracterizar: tests de `validateForm` observados vía `handleSaveKit` con los servicios
   simulados, para fijar el comportamiento actual antes de moverlo (seam 4 ampliado).
2. Extraer `services/kitFormValidationService.js`: `validateKitForm(form, selectedProducts)`
   devuelve un objeto de errores (`{ field, title, message }` o lista vacía). El hook recorre el
   primer error y llama a `showAppAlert`. Sin cambio visible.
3. Extraer `hooks/useKitForm.js`: estado del formulario, productos seleccionados, totales y
   descuento, `resetForm`, `handleClearForm`, Escape.
4. Extraer `hooks/useKitListActions.js`: cargar la lista, editar, activar o desactivar y
   eliminar.
5. `useProductsPromotions` queda como compositor delgado que une ambos hooks; se evalúa si
   puede eliminarse al final (prueba de borrado: si solo pasa datos, sobra).

- No es objetivo: añadir funciones nuevas dentro de estos pasos. Las funciones nuevas van en la
  rebanada 5, sobre la estructura ya dividida.
- Tests: seams 1 y 4; los tests existentes (`useKitsList`, servicios) deben seguir en verde sin
  cambios.

### Rebanada 5. Funciones nuevas (punto 5), una por rebanada vertical

5a. Duplicar kit

- Criterio: desde la lista, "Duplicar" carga el kit en el formulario como alta nueva, con
  descripción y código de barras vacíos o con sufijo para forzar que se corrijan (regla exacta
  SIN CONFIRMAR; no implementar hasta confirmarla), mismos componentes y precio, fechas en blanco.
- No es objetivo: copiar en la base sin pasar por el formulario.
- Tests: seam 9.

5b. Renovar vigencia desde la lista

- Criterio: acción en la fila de un kit vencido o por vencer que abre un diálogo para elegir
  nueva fecha de fin (y de inicio si aplica), usa `validateKitDateRange` y confirma antes de
  guardar. Solo actualiza las fechas.
- Requiere una función de servicio nueva en `productKitsService.js` que actualice solo las
  fechas, sin tocar componentes.
- Tests: seams 7 y 9.

5c. Aviso de vencimiento próximo

- Decisión (d): umbral de 3 días. Insignia en la fila y una franja sobre la lista con el conteo
  que, al hacer clic, filtra los kits por vencer (y vuelve a mostrar todos al repetir el clic).
- Criterio: `isKitExpiringSoon(kit, today, 3)` con fecha de hoy inyectada; no considera vencido
  ni sin fecha.
- Tests: seams 6 y 7.

5d. Tamaño de página o selector

- Decisión (b): `KITS_PAGE_SIZE` pasa de 4 a 10 y `pageSizeOptions` de `[4]` a `[5, 10, 20]`.
  Se conserva `resetPagination` al cambiar.
- Tests: seam 6.

5e. Orden de la lista

- Decisión (e): criterios fecha de vencimiento, descripción, precio y estado.
  `kitsSortService.sortKits` puro, aplicado después de `filterKits` y antes de paginar en
  `useKitsList`. Los kits sin fecha de fin van al final al ordenar por vencimiento.
- Tests: seams 5 y 6.

5f. Control por rol de editar y eliminar

- Decisión (c): solo administradores, con un hook `useIsAdmin` sobre `checkUserIsAdmin`.
- Criterio: para un no administrador, los botones de editar y eliminar no aparecen; la lista, el
  filtro y la vista siguen disponibles.
- Eliminar: el modal exige escribir `ELIMINAR` (seam 11) antes de habilitar el botón de
  confirmar; reemplaza la confirmación actual de `handleSoftDeleteKit`.
- Documentación en `PERMISSIONS.md`: nota de que editar y eliminar kits es gateo de interfaz, no
  un control de seguridad (riesgo aceptado, `KNOWN_ISSUES.md` #10/#13/#38). No hay permiso ni rol
  nuevo, así que la tabla de permisos no cambia.
- No requiere migración. Si en el futuro se quisiera aplicar en base de datos, eso sí requeriría
  una migración y tu permiso explícito.
- Tests: seams 10 y 11.

5g. Advertencia de margen

- Criterio: si el precio del kit es mayor o igual a la suma de componentes (sin descuento) o
  menor que la suma de costos (venta a pérdida), se muestra un aviso junto al resumen de
  descuento. No bloquea el guardado. `kitDiscount` y `kitDiscountPercent` ya existen y se
  reutilizan; el cálculo nuevo vive en un `kitMarginCalculationService.js` puro.
- Tests: seam 8.

## 5. Documentación a actualizar

- `docs/TESTING.md`: agregar a la tabla de cobertura los tests nuevos y actualizar el conteo de
  archivos y casos al cierre.
- `PERMISSIONS.md`: nota del gateo de interfaz con `useIsAdmin` (rebanada 5f); sin permiso nuevo.
- `KNOWN_ISSUES.md`: cualquier deuda nueva que aparezca. Estado actual: la entrada más reciente es la #82.
- `BACKLOG.md`: agregar las funciones no incluidas en esta ronda.
- `SCHEMA.md`: aclarar que fechas NULL significan sin límite y que la UI las trata así.

## 6. Cierre

1. `npm run check:agents`, `npm test`, `npx eslint` y `npx prettier --check` sobre el diff, y
   `npm run build:frontend`.
2. Commits por rebanada, solo cuando lo pidas, con el pie `Co-Authored-By: Claude Sonnet 5.5
<noreply@anthropic.com>`. Nunca se hace `git add -A` ni se incluye `.claude/`.
3. Auditoría del PR #186 con el agente `pr-auditor`.

## 7. Restricciones permanentes

- No aplicar migraciones ni tocar la base remota sin permiso explícito. La migración
  `20261101120000_kits_vigencia_por_fechas.sql` ya está aplicada.
- Cero emojis, cero `console.log`/`console.warn`, cero `!important`, solo CSS Modules, los
  componentes de UI no importan `supabase`.
