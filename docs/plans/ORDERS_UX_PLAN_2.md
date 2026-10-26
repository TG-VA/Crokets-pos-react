# Plan 2: estandarizacion visual y de datos del modulo Pedidos

Continuacion del PR #176 (rama `feat/orders-receive-ux`). Mismas reglas que el
plan anterior (`docs/plans/ORDERS_RECEIVE_UX_PLAN.md`): CSS Modules, cero
`!important`, cero emojis, SRP/DIP, EOF newline, commits atomicos en
Conventional Commits, tests con Vitest, y antes de cada push `npm run
check:agents`, `npm test`, ESLint y Prettier sobre el diff y `npm run
build:frontend`. Skills sugeridos: `lean-build`, `tdd` (formateadores y
conteo), `safe-refactor` (extraccion de componentes de badge), `migration`
(solo la parte de datos), y un skill de diseno para los badges.

Alcance: `src/components/InventoryComponents/PageInventory/PageOrders/` y
`NavbarInventory` solo para verificar. No se rehace nada ya entregado en el
plan anterior.

## Solicitudes del usuario

### 1. Nombres de pedido en mayusculas

Hoy el nombre se guarda tal como se escribe (`create_store_order` solo hace
`trim`) y se muestra tal cual en tarjetas, historial, detalle, impresion y
Excel. Los pedidos ya existentes estan en mayusculas y minusculas mezcladas.

Entrega en tres capas, para que sea consistente aunque haya datos viejos:

- 1a. Captura: el campo "Nombre del pedido" convierte a mayusculas mientras se
  escribe (`useCreateOrderForm.setOrderName`) y `validateOrderDraft` /
  `createStoreOrder` envian `orderName.trim().toUpperCase()`. Usar
  `toLocaleUpperCase("es-MX")`. Test en `useCreateOrderForm` y
  `ordersService.test.js`.
- 1b. Visualizacion: una funcion pura `formatOrderName` en
  `ordersFormatters.js` (mayusculas, retorna cadena vacia si no hay valor,
  LSP) aplicada en `normalizeStoreOrder`, de modo que tarjetas, historial,
  detalle, impresion y Excel la heredan sin tocar cada vista. Test.
- 1c. Datos (backend): migracion nueva (timestamp posterior a
  `20261025185033`) que (i) hace `upper(trim(p_order_name))` dentro de
  `create_store_order` y (ii) actualiza los nombres existentes con `update
public.store_orders set order_name = upper(order_name) where order_name <>
upper(order_name)`. Incluye prueba de contrato SQL como
  `storeOrdersIntegrityContract.test.js`. **Aplicar solo con confirmacion del
  usuario**, y verificar antes con una consulta de solo lectura cuantas filas
  cambiarian. Como `create_store_order` se redefine, reutilizar la ultima
  version de la funcion (`20261024120000_store_orders_integrity.sql`) y solo
  cambiar esa linea; no tocar la logica de folio ni de cantidades. Si la
  migracion no se aprueba, 1a y 1b ya cubren la interfaz.
- La busqueda y los filtros ya normalizan texto (`normalizeText`), no se ven
  afectados.

### 2. "Generado por" y "Recibido por" en mayusculas

`OrderPreviewSections` muestra `createdByLabel` y `receivedByLabel`, que
vienen de `users.username`. No se modifican los usernames en la base. Aplicar
mayusculas solo al mostrar, en `normalizeStoreOrder` (`createdByLabel` y
`receivedByLabel`) o con un formateador `formatPersonLabel` reutilizable. Vale
tambien para la impresion y el Excel (misma fuente). Conservar "—" cuando no
hay valor. Tests en `ordersFormatters.test.js` y
`OrderPreviewSections.test.jsx`.

### 3. Sucursales como badges de color (modal de detalle)

Hallazgo: `OrderDetailModal.jsx` ya usa `styles.routeBadgeOrange` y
`styles.routeBadgeDark`, pero **esas clases no existen en
`PageOrders.module.css`**, por lo que hoy el texto "Recibe Torres desde
Huayacan" se ve sin estilo. Hay que definirlas.

- Crear un componente `BranchBadge` (`components/BranchBadge.jsx`) con prop
  `role` (`"origin"` o `"destination"`) y `name`. Una sola fuente del color por
  rol (OCP/DRY). Clases `branchBadgeOrigin` y `branchBadgeDestination`, texto
  en negrita.
- Decision de color (propuesta, confirmar con el usuario): quien envia
  (origen) en azul de marca (`--croketsBlueDark` sobre fondo claro del mismo
  tono); quien recibe (destino) en naranja de marca (`--croketsOrange` sobre
  fondo claro). Deben diferenciarse de los colores de estado (verde, amarillo,
  rojo) para no confundirse con el estado del pedido. Documentar la decision en
  el CSS del componente.
- Reemplazar los usos por `BranchBadge` y el texto "Recibe X / desde Y" por una
  lectura clara, por ejemplo `[ORIGEN: Huayacan] hacia [DESTINO: Torres]` o
  con una etiqueta corta antes de cada badge. Aplicar el mismo componente en
  todos los lugares donde aparece una sucursal:
  - `OrderDetailModal` (encabezado).
  - `OrdersHistoryTable` (columna "Ruta": hoy `toBranchName` mas "desde ..." en
    texto gris).
  - `PendingOrderCard` (campo "Origen") y `ReceiptPanel` ("X hacia Y").
  - `OrderPrintModal` / vista previa de impresion (mantener legible en
    impresion: no depender solo del color, el texto "Origen"/"Destino" debe
    permanecer).
- Accesibilidad: el color no es la unica pista; el rol va en texto
  (`aria-label` o etiqueta visible). Verificar contraste AA del texto sobre el
  fondo claro.
- Tests: render por rol y clase aplicada; actualizar tests existentes de
  historial y detalle que buscan "desde ...".

### 4. Onomatopeya de "Recibidos" en naranja

El contador de la pestana "Recibidos" (`.tabBadge` en
`PageOrders.module.css`) usa `var(--croketsBlue)`. Cambiar a
`var(--croketsOrange)` (el mismo naranja que usa `NavbarInventory`
`.badgePendientes`, `#fc8913`). Texto blanco en negrita. Revisar el estado de
la pestana activa para que el contraste siga correcto. El contador del navbar
ya es naranja; solo verificarlo.

### 5. Historial: columna "Diferencia" solo con el numero

Hoy `OrdersHistoryTable` muestra `getOrderDifferenceLabel(order)`: texto
"Pendiente de recepcion", las `discrepancyNotes` completas o "Con diferencia" /
"Sin diferencia".

- Mostrar unicamente un numero: la cantidad de productos con diferencia
  (`getOrderDifferences(order.items).length`, la misma regla ya usada en el
  aviso de recepcion). Sin texto, sin notas.
- Pedidos pendientes: guion "—" (aun no hay recepcion). Sin diferencias: `0`.
- Presentarlo como badge en negrita (ver punto 6), con tono de advertencia o
  error cuando es mayor que 0 y neutro o de exito cuando es 0.
- Pregunta abierta para confirmar: "productos faltantes" se interpreta como
  productos con diferencia distinta de cero (faltantes y sobrantes), igual que
  el aviso de recepcion. Si el usuario quiere contar solo faltantes
  (diferencia negativa), cambiar el conteo; el resto del plan no cambia.
- Verificar que las ordenes del historial traen `items` (el `select` de
  `loadStoreOrders` usa `STORE_ORDER_SELECT`, que incluye partidas); agregar
  test. Reemplazar `getOrderDifferenceLabel` por `getOrderDifferenceCount` y
  eliminar la funcion vieja y su test si queda sin uso. Eliminar tambien el
  CSS `.discrepancyText` si queda sin uso.
- Actualizar `OrdersHistoryTable.test.jsx`.

### 6. Todos los badges del modulo en negrita

Auditoria de badges y pildoras del modulo (hoy casi ninguno define
`font-weight`, salvo `statusBadgeBold` solo en impresion):

`tabBadge`, `statusBadge` (y `statusPending`, `statusSuccess`,
`statusWarning`, `statusDanger`), `differenceBadge` (y `differenceOk`,
`differenceOver`, `differenceShort`, `differencePending`), `branchBadge`
("Sucursal activa"), `deptBadge`, `departmentChip`, `statusPill`,
`statBadge`, mas los nuevos `BranchBadge` y el badge de diferencia del
historial.

- Estandarizar con una sola regla: poner `font-weight: 700` en la definicion
  base de cada clase de badge (no en una clase aparte), y eliminar
  `statusBadgeBold` y su uso en `OrderPrintModal`.
- Sin `!important`. Verificar visualmente que `statusPending`, que hoy
  repite `padding`, `border-radius` y `font-weight: 600`, no pise la regla
  (resolver por orden de selectores).

## Hallazgos adicionales del analisis a fondo

- H1. Clases `routeBadgeOrange` y `routeBadgeDark` sin definicion (ver punto
  3). Ademas, buscar con un script cualquier otra clase usada en JSX y no
  definida en el CSS del modulo; agregar un test o chequeo manual y corregirlas
  todas.
- H2. Texto de `OrdersHeroSection`: dice "Control de pedidos de abastecimiento
  con proveedores", pero el modulo es entre sucursales. Corregir el copy.
- H3. `OrdersHeroSection`: "Pedidos historicos" sin acento y el indicador "Con
  diferencia" usa el icono de check (circle-check), que comunica exito, no
  diferencia. Cambiar a un icono de advertencia (`triangle-exclamation`) y
  acentuar ("Pedidos históricos").
- H4. Acentos pendientes en el modulo (el plan anterior solo cubrio algunos
  encabezados): "Codigo" en tablas ya corregido, pero faltan placeholders y
  etiquetas como "Ej. Reposicion semanal", "Agregar por codigo de barras",
  "Escanea o escribe el codigo", "Pendiente de recepcion", "Conteo fisico"
  (aviso de error) y los mensajes de `ordersService`. Revisar todo el modulo
  con un grep de palabras sin acento y corregir en una sola pasada, ajustando
  los tests que comparan texto exacto.
- H5. `OrdersHistoryFilters`: los filtros de sucursal "origen" y "destino" son
  selects sin indicacion visual de rol; usar las mismas etiquetas "Origen" /
  "Destino" que los badges para mantener el vocabulario.
- H6. Excel (`ordersExportExcelModel` / `ordersWorkbookBuilder`): hereda el
  nombre y los responsables de `normalizeStoreOrder`; verificar con test que
  salen en mayusculas y que la columna de diferencias del Excel coincide con el
  conteo del historial.
- H7. `useCreateOrderForm`: al guardar con exito el formulario debe limpiarse y
  el nombre se debe mostrar en mayusculas en el aviso `Pedido X enviado a Y`;
  revisar que el aviso use el nombre de sucursal en el mismo formato que el
  resto.
- H8. `FeedbackBanner`: el aviso de creacion y de recepcion no se cierra solo.
  Evaluar cierre automatico (por ejemplo a los 8 s) conservando el boton;
  confirmar con el usuario antes de implementarlo.
- H9. Estado de carga y vacio: `ReceiveOrdersWorkspace` y el historial no
  muestran esqueleto durante `isLoading`; con el realtime ya activo evitar
  parpadeos. Solo reportar si se reproduce; no es parte de este PR salvo que
  el usuario lo pida.
- H10. Realtime (verificacion pendiente del PR anterior): probar en la app con
  dos sucursales que la lista y los contadores cambian sin recargar. Si no,
  revisar la politica RLS de `store_orders` (SELECT para el rol autenticado de
  la sucursal destino) y reportar sin modificar politicas sin aprobacion.

## Orden y commits sugeridos (mismo PR #176)

1. `feat(orders): nombre de pedido en mayusculas al capturar y mostrar` (1a, 1b)
2. `feat(orders): responsables del pedido en mayusculas` (2)
3. `feat(orders): componente BranchBadge con color por rol` (3, H1, H5)
4. `refactor(orders): usar BranchBadge en detalle, historial, tarjetas y panel` (3)
5. `style(orders): contador de Recibidos en naranja` (4)
6. `feat(orders): columna Diferencia del historial como numero` (5)
7. `style(orders): badges del modulo en negrita` (6)
8. `fix(orders): copy, iconos y acentos pendientes del modulo` (H2, H3, H4)
9. `feat(db): nombre de pedido en mayusculas en create_store_order` (1c).
   Migracion nueva y prueba de contrato. Aplicar al remoto solo con
   confirmacion; registrar en `docs/SUPABASE_MIGRATIONS.md`.
10. `docs(orders): registrar cambios y decisiones` (TESTING.md y este plan con
    el estado final).

Al terminar, actualizar la descripcion del PR #176 con los cambios nuevos
(resumen por area, migracion pendiente o aplicada, evidencia de verificacion).

## Tests requeridos

- `formatOrderName` y `formatPersonLabel`: mayusculas, acentos, vacio y nulo.
- `ordersService`: `createStoreOrder` envia el nombre en mayusculas.
- `BranchBadge`: clase por rol y texto de rol visible.
- `OrdersHistoryTable`: columna "Diferencia" muestra badges con signo, "—" en
  pendientes y `0` sin diferencias; la ruta usa badges.
- `OrderPreviewSections`: "Generado por" y "Recibido por" en mayusculas.
- Contrato SQL de la migracion de mayusculas.
- Chequeo de clases CSS usadas y no definidas (H1) y de `font-weight: 700` en
  los badges auditados (revision manual o test sencillo de lectura del CSS).

## Preguntas para confirmar antes de ejecutar

1. Colores de rol: origen azul y destino naranja (propuesta).
2. "Productos faltantes" en Diferencia: contar productos con diferencia (faltante
   o sobrante) o solo los faltantes.
3. Aprobacion para aplicar al remoto la migracion de mayusculas (incluye
   actualizar los nombres existentes).
4. Cierre automatico del aviso (H8): si o no.

## Estado final

Implementado en el PR #176. Respuestas del usuario: origen azul y destino
naranja; la diferencia cuenta productos con faltante o sobrante; migracion
aplicada al remoto; cierre automatico del aviso aprobado (8 s, los errores no
se cierran solos).

- La migracion de mayusculas quedo como `20261025190000` (la propuesta
  `20261025140000` quedaba antes de la ultima version remota). Los 7 pedidos
  existentes ya estaban en mayusculas, el `update` no cambio filas.
- `statBadge` (tarjetas de resumen del formulario de crear pedido) no se toco:
  es una tarjeta con etiqueta y valor, no una pildora.
- H5 ya estaba cubierto: los filtros ya se llaman "Origen" y "Destino".
- H9 (esqueleto de carga) y H10 (prueba del realtime con dos sucursales) siguen
  pendientes de verificacion manual.

### Segunda tanda (mismo PR #176)

- Seguridad: `create_store_order` y `receive_store_order` tenian `EXECUTE` para
  `anon`. La migracion `20261025200000_store_orders_revoke_anon.sql` (aplicada)
  revoca `anon`/`PUBLIC` y solo acepta `p_user_id` con rol `service_role`.
  Las demas RPC del modulo (traspasos) ya no tenian `anon`.
- Realtime: guia de prueba manual en `docs/plans/ORDERS_REALTIME_MANUAL_TEST.md`.
  La politica SELECT de `store_orders` es `authenticated` con `true`, por lo que
  RLS no bloquea los eventos. H10 sigue pendiente de ejecutarse a mano.
- Diferencia del historial: badge rojo `-N` (productos con faltante) y azul
  `+N` (productos con sobrante), `0` sin diferencias, guion si no hay recepcion.
- `BranchBadge`: nombre en mayusculas y mas grande, antes del rol.
- Modal de detalle: nombre y estado en el encabezado, fila de ruta con
  conector "hacia" (no existe icono de flecha en `src/assets/icons`) y metadatos
  en tarjetas.
- Modal de detalle, mas espacio: el titulo de `AppModal` pasa a `Pedido <numero>`
  (el nombre ya va en el encabezado del cuerpo, antes estaba duplicado y se
  envolvia con nombres largos); `AppModal` no se modifico porque `size="large"`
  lo usan tambien `TransferDetailModal` y `OrderPrintModal`. La ruta
  (`.detailContent .detailRoute` y `.detailContent .routeBadge`) y "Notas del
  pedido" (`.detailNote`) tienen mas padding y separacion; la impresion y los
  demas usos de `BranchBadge` conservan el tamano base.
- `OrderNameBadge`: el nombre del pedido es una pastilla gris
  (gris `#5c6b77` con texto blanco). No se uso naranja claro porque coincidiria
  con el destino de `BranchBadge`; azul y verde/amarillo/rojo ya significan
  origen y estado. Alcance: solo el modal de detalle (respuesta del usuario).
