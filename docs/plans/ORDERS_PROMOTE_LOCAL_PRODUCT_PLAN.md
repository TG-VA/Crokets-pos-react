# Plan: volver global un producto local desde la busqueda de pedidos

Rama: `feat/pedidos-detalle-producto-sucursal`.

## Objetivo

En el modal "Busqueda de Productos" de Crear pedido, al hacer doble clic sobre
una fila con la etiqueta "Producto local" se abre un modal que explica las
consecuencias, pide escribir `CONFIRMAR` y tiene un boton para ejecutar el
cambio. Al terminar, el producto deja de ser local: pierde la etiqueta y se
puede agregar al pedido.

## Aceptacion

- Doble clic en una fila local abre el modal. Doble clic en una fila global o
  kit no hace nada.
- El boton de confirmar queda deshabilitado hasta que el texto sea exactamente
  `CONFIRMAR`.
- Solo un administrador puede ejecutarlo. La regla se valida en la base de
  datos, no solo en la interfaz.
- El cambio queda registrado en `audit_logs` (entidad `product`).
- Tras el exito la busqueda se actualiza y la fila ya no aparece como local.
- Si el RPC falla, el modal muestra el mensaje y el producto no cambia.

## No incluido

- Revertir un producto a local.
- Motivo obligatorio (el campo no existe; el registro de auditoria basta).
- Cambiar el flujo existente de `ProductsModify`.
- Promover kits: se rechazan.

## Consecuencias que explica el modal

- El producto aparece en el catalogo de todas las sucursales, con existencia 0
  donde no tenga inventario.
- Entra a los reportes de inventario y de productos.
- Se puede pedir con `create_store_order`.
- Las demas sucursales ven el precio de catalogo hasta tener el suyo.
- No se pierde nada: inventario, existencias, ventas y movimientos cuelgan de
  `product_id`.
- Revertirlo despues no es limpio si otras sucursales crearon inventario.

## Diseno

- Migracion con RPC `promote_product_to_global(p_product_id uuid)`, `security
  definer`, `set search_path = public`, grant solo a `authenticated`. Valida
  `public.is_admin()`, rechaza producto inexistente, inactivo, kit o ya global,
  actualiza `is_global` y escribe en `audit_logs` valores anterior y nuevo.
  Devuelve `jsonb` con `success`, `code` y `message`, como
  `update_cash_max_opening_amount`. Es aditiva (`create or replace`), el
  rollback es `drop function`.
- Nota: `products` no tiene RLS en la base remota (verificado), asi que la
  validacion del RPC protege el camino de la app pero no impide un update
  directo con la clave anon. Endurecerlo es otro trabajo.
- Servicio `promoteProductToGlobalService.js` y hook `usePromoteLocalProduct`
  para que la interfaz no importe `supabase`.
- `MakeGlobalConfirmModal` en la carpeta del modal de busqueda, con CSS Module.
- `InventorySearchResults` recibe `onLocalProductDoubleClick`;
  `InventorySearchModal` controla el modal y recarga el catalogo local.

## Commits atomicos

1. `docs(orders)`: este plan.
2. `feat(orders)`: migracion y RPC.
3. `feat(orders)`: servicio y hook con tests.
4. `feat(orders)`: modal de confirmacion y doble clic en la busqueda, con tests.

## Verificacion

`npm run check:agents`, `npm test`, Prettier y ESLint sobre el diff,
`npm run build:frontend`. Prueba manual con un administrador y con un usuario
sin rol admin.
