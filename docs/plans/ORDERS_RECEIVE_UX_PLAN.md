# Plan: mejoras UX del modulo Inventario / Pedidos

Alcance: `src/components/InventoryComponents/PageInventory/PageOrders/` y
`src/contexts/PendingOrdersContext.jsx`. Todo se entrega en UN solo PR, con
commits atomicos (ver "Flujo de trabajo").
Seguir `AGENTS.md`: CSS Modules, cero `!important`, cero emojis, SRP/DIP, EOF
newline, tests con Vitest. Antes de cada PR: `npm run check:agents`,
`npm test`, ESLint y Prettier sobre el diff.

Para toda la UI nueva (tarjetas, botones, badges, tabla de diferencias),
cargar un skill de diseno antes de escribir CSS y reutilizar los tokens
existentes (`--croketsOrange`, `--croketsBlueDark`, `--errorText`, etc.).

## Hallazgos reportados por el usuario

### A. Pantalla "Pedidos por recibir" (`ReceiveOrdersWorkspace.jsx`)

- A1. Icono del boton "Recibir pedido" debe ser blanco. Hoy `ImportIcon` es un
  `<img>` sin tinte; el boton tiene fondo naranja.
- A2. Paginacion: hoy existe (`usePagination`) pero con `defaultPageSize: 10`,
  opciones `[5, 10, 25]` y la barra solo aparece si hay mas de `pageSize`
  pedidos. Cambiar a 4 por pagina y opciones coherentes (por ejemplo `[4, 8, 12]`).
  Actualizar la `storageKey` para que un tamano guardado anterior no gane.
- A3. Rediseno UI de las tarjetas de pedido (`.orderCard`): jerarquia visual,
  folio, estado, ruta origen a destino, fecha, conteo de productos, departamentos
  como chips.
- A4. Boton "Ver detalle" demasiado simple: rediseno (estilo secundario con
  icono).
- A5. Boton "Cambiar pedido" (panel de captura) demasiado simple: rediseno con
  icono y mejor jerarquia.
- A6. Boton "Registrar recepcion": icono blanco.
- A7. Panel de captura (`receiptPanel`) no tiene paginacion. Pedidos de 50 o mas
  productos: agregar `usePagination` y `PaginationBar` a la tabla.
  Importante: las cantidades viven en `quantities` (por `productId`) dentro de
  `useReceiveOrderForm`, no en la tabla, asi que cambiar de pagina no pierde
  capturas. El conteo "capturados" y `missingItems` deben seguir calculandose
  sobre TODOS los items, no solo la pagina visible.
- A8. El mensaje "Faltan N producto(s) por capturar" debe ser un badge rojo,
  no texto con icono de check. Cuando el conteo esta completo, badge de exito.

### B. Modal "Ver detalle" (`OrderDetailModal.jsx`, `OrderPreviewSections.jsx`)

- B1. Boton "Exportar a Excel": icono del mismo azul que el texto
  (`--croketsBlueDark`) y moverlo al footer del modal, a la misma altura que
  "Cerrar". `AppModal` solo soporta `confirmText`/`cancelText`; extender con una
  prop de acciones extra (por ejemplo `footerActions`, ReactNode renderizado en
  `.actions` antes del boton de confirmar). Cambio retrocompatible; probarlo.
- B2. Paginacion de la tabla de partidas (pedidos de mas de 50 productos).
  `OrderPreviewSections` pagina siempre; se elimino la vista previa de
  impresion y la exportacion queda en el footer del detalle.
- B3. Seccion "Diferencias de recepcion": mantener el titulo, pero mostrar una
  tabla con Codigo, Producto, Departamento y Diferencia (hoy hay una tabla
  "Diferencias" mas un bloque de texto `discrepancyNotes`). Unificar: una sola
  seccion titulada "Diferencias de recepcion" con la tabla; eliminar el bloque
  de texto del cuerpo. La tabla ya existe (`differencesTable`); reutilizarla.
  Considerar paginarla tambien si hay muchas diferencias.
- B4. El icono "i" del encabezado del modal (esquina superior izquierda,
  `AppModal` `.iconWrapper`) se aplasta cuando el contenido es largo, como al
  mostrar diferencias de recepcion. Causa probable: `.iconWrapper` tiene
  `width/height/min-width` fijos pero no `min-height` ni `flex-shrink: 0`, y en
  `size-large` el `.body` es columna con `overflow: auto`, por lo que el flex
  puede comprimir el alto. Fix en `AppModal.module.css`: `flex: 0 0 auto` y
  `min-height: 60px`. Reproducir primero con un pedido con diferencias.

### C. Mensajes (`FeedbackBanner.jsx`, `useOrdersPage.js`)

- C1. Icono "x" del banner de feedback debe ser blanco. Hoy `xmark-solid-full.svg`
  se ve negro. Aplicar tinte blanco por CSS (mascara con `background-color:
currentColor` como en `AppModal`, o `filter` solo si no hay alternativa).
  Verificar contraste en los cuatro tonos (success, warning, error, info).
- C2. Mensaje de recepcion con diferencias: hoy concatena
  `discrepancyNotes` completo. Cambiar a: "Pedido X recibido con N productos
  con diferencia." (N = numero de items con diferencia distinto de cero, via
  `getOrderDifferences`). Sin la palabra "faltantes". El detalle vive en el
  modal.

### D. Actualizacion en tiempo real

- D1. Hoy no hay realtime en pedidos: `useOrdersData` carga una vez y
  `PendingOrdersContext` hace polling cada 30 s. Un pedido enviado desde otra
  sucursal no aparece hasta salir y volver a entrar.
- D2. Solucion: crear `ordersRealtimeService.js` en `src/services/inventory/` (lo consume tambien un contexto global)
  con la misma forma que `customersRealtimeService.js`
  (`subscribeToTableChanges`, el cliente de Supabase confinado al servicio, DIP).
  Observar `store_orders` (y `store_order_items` si el listado depende de el)
  con `rowFilter` `to_branch_id=eq.<branch>`.
  - `PendingOrdersContext`: suscribirse y llamar `refresh()` para que el
    contador del navbar cambie al instante. Mantener el polling como respaldo,
    espaciado.
  - `useOrdersData`: suscribirse y llamar `refreshData({ showLoader: false })`
    con debounce corto para no recargar en rafaga.
  - Si el panel de captura esta abierto, la recarga no debe resetear
    `quantities` ni deseleccionar el pedido (el estado vive en
    `useReceiveOrderForm`; verificar que `selectedOrder` se resuelve por id).
- D3. Prerrequisito de backend a verificar (no asumir): que `store_orders` este
  en la publicacion `supabase_realtime` y que RLS permita al usuario leer las
  filas de su sucursal. Hoy no hay mencion de `supabase_realtime` en
  `supabase/migrations`. Si falta, agregar migracion nueva (ver
  `docs/SUPABASE_MIGRATIONS.md`), con prueba de contrato como
  `storeOrdersIntegrityContract.test.js`. No aplicar a produccion sin
  confirmacion del usuario.

## Hallazgos adicionales del analisis de codigo

- E1. Desfase de nombre: la tabla de captura usa "Conteo fisico" y la de
  detalle "Recibido". Unificar terminologia o documentar la diferencia.
- E2. Textos sin acentos en UI ("Codigo", "Conteo fisico", "recepcion",
  "Registrar recepcion"). El resto del modulo usa acentos ("Recepcion" en
  eyebrow si, "Recepción" en otros). Normalizar a espanol con acentos en todo el
  modulo (cuidar tests que comparan texto).
- E3. Mensaje de error de `submitReceipt` repite "(N pendiente(s))" aunque ya
  habra un badge de faltantes; alinear con el nuevo badge.
- E4. Validacion de captura: el campo de cantidad no marca visualmente las filas
  sin capturar. Con paginacion en A7, el usuario no vera las filas faltantes en
  otras paginas. Agregar al badge de faltantes una accion "Ir al primer
  pendiente" que salte a la pagina correcta, o un resumen de paginas con
  pendientes.
- E5. Paginacion con captura por teclado: tras cambiar de pagina, enfocar el
  primer input de la nueva pagina (flujo de captura con lector/teclado).
- E6. `OrdersHistoryTable` ya pagina; confirmar que el modal de detalle abierto
  desde historial hereda la paginacion de B2 sin romper la impresion.
- E7. `.detailActions` quedara huerfano tras B1; eliminar CSS muerto.
- E8. `.feedbackClose` no tiene estado `:hover` ni `:focus-visible`; agregar
  junto con C1.
- E9. Estado de carga: `ReceiveOrdersWorkspace` no muestra esqueleto durante
  `isLoading`; con realtime y recargas, evitar parpadeo (recargas sin loader ya
  se usan en `syncAfterMutation`, mantenerlo).
- E10. Accesibilidad: el badge de faltantes debe usar `role="status"` con
  `aria-live="polite"` para que el cambio de conteo se anuncie.

## Flujo de trabajo (un solo PR)

1. Partir de `main` actualizado y crear una rama nueva, por ejemplo
   `feat/orders-receive-ux`, y moverse a ella (`git switch -c`). Nunca
   commitear en `main`.
2. Leer antes de escribir: `AGENTS.md`, `docs/TESTING.md`,
   `docs/SUPABASE_MIGRATIONS.md` y, para el cambio de realtime,
   `docs/ENV_VARIABLES.md` si aplica. Cargar los skills correspondientes:
   `lean-build` (alcance), `tdd` (logica nueva), `safe-refactor`
   (cambios en `AppModal` y `OrderPreviewSections`), `migration` (solo si
   hace falta la migracion de realtime), y un skill de diseno para las
   tarjetas y botones (A3, A4, A5, A8).
3. Commits atomicos, uno por cambio logico, en Conventional Commits, cada
   uno con tests verdes y sin dejar la rama rota. Orden y agrupacion:
   - `fix(orders): iconos blancos en recibir pedido y registrar recepcion` (A1, A6)
   - `fix(orders): icono de cierre blanco en el aviso` (C1, E8)
   - `feat(orders): resumir diferencias por conteo en el aviso de recepcion` (C2)
   - `fix(modal): evitar que el icono del AppModal se aplaste` (B4)
   - `feat(modal): footerActions en AppModal` (B1, parte AppModal)
   - `feat(orders): exportar a Excel en el footer del detalle` (B1)
   - `feat(orders): paginar partidas del detalle (opcional por prop)` (B2)
   - `feat(orders): tabla Diferencias de recepcion en el detalle` (B3)
   - `feat(orders): paginar pedidos por recibir a 4 por pagina` (A2)
   - `feat(orders): paginar la tabla del panel de recepcion` (A7, E4, E5)
   - `feat(orders): badge de productos faltantes por capturar` (A8, E10)
   - `style(orders): rediseno de tarjetas y botones de recepcion` (A3, A4, A5)
   - `feat(orders): servicio realtime de pedidos` (D2)
   - `feat(orders): actualizar lista y contador del navbar en tiempo real` (D2)
   - `feat(db): publicar store_orders en realtime` (D3, solo si falta; sin
     aplicar a produccion sin confirmacion del usuario)
   - `refactor(orders): acentos, terminologia y CSS muerto` (E1, E2, E3, E7)
   - `docs(orders): registrar cambios y decisiones` (actualizar los .md
     relevantes, p. ej. `docs/TESTING.md` si cambian los patrones de mock, y
     este plan con el estado final)
4. Antes de abrir el PR: `npm run check:agents`, `npm test`, ESLint y
   Prettier sobre el diff, `npm run build:frontend`. Si algo falla, corregirlo
   en un commit nuevo y reportarlo.
5. Push de la rama y abrir el PR contra `main` con `gh pr create`. Usar el
   skill `pr` para el cuerpo. Titulo sugerido:
   `feat(orders): mejoras UX de recepcion de pedidos, paginacion y realtime`.
   La descripcion debe incluir: resumen, lista de cambios agrupada por area
   (recepcion, detalle, avisos, realtime), notas de la migracion si la hay,
   capturas antes/despues de la UI, evidencia de verificacion (resultados de
   check:agents, tests y build), riesgos (cambio en `AppModal` compartido,
   dependencia de la publicacion realtime) y lo que queda fuera de alcance.
   Terminar el cuerpo con la linea de atribucion indicada por el entorno.
   No hacer merge; entregar el link del PR.

## Tests requeridos

- `usePagination` con 4 por pagina: pendingOrders de 9 produce 3 paginas.
- Captura en pagina 2 se conserva al volver a pagina 1; `missingItems` cuenta
  todos los items.
- `OrderPreviewSections`: pagina las partidas; la seccion "Diferencias de
  recepcion" renderiza tabla y no el texto.
- `AppModal`: `footerActions` se renderiza junto a "Cerrar".
- Mensaje de recepcion con diferencias cuenta items, no concatena notas.
- Servicio realtime: suscribe y limpia el canal; el contexto refresca al evento
  (mock de `subscribeToTableChanges`).
- Ejecutar `npm run build:frontend` al final de cada PR.

## Estado final

Implementado en la rama `feat/orders-receive-ux`. Decisiones tomadas durante la
ejecucion:

- C1: el aviso usa fondo solido (color de texto de cada tono) con texto e icono
  de cierre blancos; un icono blanco sobre el fondo claro anterior no se veria.
- B2/B3 se entregaron en un solo commit por compartir `OrderPreviewSections`.
- A3 a A5, A7 y A8 se entregaron en un solo commit al extraer
  `PendingOrderCard` y `ReceiptPanel` de `ReceiveOrdersWorkspace`.
- D3: se verifico con consulta de solo lectura que `store_orders` no estaba en
  `supabase_realtime`. La migracion `20261025130000_store_orders_realtime.sql`
  queda pendiente de aplicar al remoto. Sin ella, el realtime no emite eventos y
  el polling de 30 s sigue actualizando el contador.
- E1 (unificar "Conteo fisico" y "Recibido") no se aplico: son etapas distintas
  (captura y resultado).
