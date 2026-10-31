# Plan: conservar el borrador de "Crear pedido" al navegar

Rama: `feat/pedidos-detalle-producto-sucursal`.

## Sintoma

Al armar un pedido en Inventario/Pedidos y moverse a otro modulo o pagina, el
pedido (nombre, sucursal destino, notas y productos) se pierde por completo.

## Causa

`useCreateOrderForm` guarda el borrador con `useState` local. Lo consume
`useOrdersPage`, que vive dentro de `PageOrders`. Al cambiar de ruta React
desmonta `PageOrders` y el estado se destruye. Evidencia: `useCreateOrderForm.js`
no usa ningun almacen fuera del componente y `App.jsx` no monta ningun provider
para pedidos.

## Precedente

`SalesCartProvider` (`src/contexts/SalesCartContext.jsx`) resolvio el mismo
problema para el carrito de Ventas: el estado vive en un provider montado en
`App.jsx` por encima de las rutas.

## Diseno

- Nuevo `OrderDraftProvider` en `src/contexts/OrderDraftContext.jsx`. Guarda solo
  los campos que el usuario captura: `orderName`, `destinationBranchId`, `notes`
  e `items`.
- El provider se monta en `App.jsx` junto a `SalesCartProvider`.
- `useCreateOrderForm` lee y escribe el borrador desde el contexto. Siguen
  locales los estados de UI que no deben sobrevivir: `searchOpen`, `error`,
  `isSaving`.
- El borrador se descarta cuando: se crea el pedido con exito (`resetForm`), el
  usuario usa el reinicio explicito, o cambia el usuario o la sucursal actual
  (cierre de sesion o cambio de sucursal; el destino ya no seria valido).
- Solo memoria. No se usa `sessionStorage`: recargar la ventana de Electron no
  es el caso reportado y un borrador viejo restaurado podria apuntar a
  productos o sucursales obsoletos.

## Commits atomicos

1. `docs(orders)`: este plan.
2. `feat(orders)`: `OrderDraftContext` con tests (conserva entre desmontajes,
   se reinicia al cambiar usuario o sucursal).
3. `feat(orders)`: `useCreateOrderForm` usa el contexto; tests actualizados con
   el provider y caso de persistencia.
4. `feat(orders)`: montar `OrderDraftProvider` en `App.jsx`.

## Verificacion

`npm run check:agents`, `npm test`, Prettier y ESLint sobre el diff,
`npm run build:frontend`. Prueba manual: armar un pedido, ir a Ventas, volver a
Pedidos > Crear y comprobar que el borrador sigue. Despues crear el pedido y
comprobar que el formulario queda vacio.
