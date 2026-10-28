# Guía de prueba manual: realtime de pedidos entre sucursales

Verifica que `store_orders` (publicada en `supabase_realtime` por la migración
`20261025130000_store_orders_realtime.sql`) actualiza la pantalla de Pedidos y el
contador del navbar sin recargar. La suscripción vive en
`src/services/inventory/ordersRealtimeService.js` y la consumen
`PageOrders/hooks/useOrdersData.js` y `contexts/PendingOrdersContext.jsx`.

## Preparación

1. Dos sesiones independientes: ventana normal con un usuario de la sucursal A (origen) y ventana
   de incógnito (o segundo equipo) con un usuario de la sucursal B (destino). Un usuario por
   ventana; las sesiones de Supabase no se comparten entre ventanas del mismo perfil.
2. Ambas sesiones con DevTools abierto en la pestaña Console (solo para ver errores de canal).
3. B abre Inventario > Pedidos > Recibidos y A abre Inventario > Pedidos > Crear. Anotar el
   contador del navbar de B (debe estar en 0 o el valor actual).

## Caso 1: envío

1. En A, crear un pedido hacia B con al menos un producto y enviarlo.
2. En B, sin recargar ni cambiar de pestaña, esperar hasta 5 s.
3. Esperado: aparece la tarjeta del pedido en "Recibidos" y el contador del navbar sube en 1.
4. Repetir con B en otra sección del sistema (por ejemplo Ventas): el contador del navbar también
   debe subir, porque lo alimenta `PendingOrdersContext`.

## Caso 2: recepción

1. En B, abrir el pedido, capturar el conteo físico (con y sin diferencias) y confirmar.
2. En B: la tarjeta desaparece de "Recibidos", el contador baja en 1 y el pedido aparece en el
   historial con su estado.
3. En A, sin recargar, abrir el historial: el estado del pedido cambia a recibido (o recibido con
   diferencia) y la columna Diferencia se llena.

## Caso 3: aislamiento de sucursal

1. Con una tercera sucursal C (si existe), verificar que su contador de Recibidos no sube cuando A
   envía un pedido a B.

## Resultado esperado y diagnóstico

- Todo debe ocurrir sin recargar. Si algo no se actualiza, anotar el caso y el mensaje de la consola.
- Revisión previa hecha el 25 oct 2026 (solo lectura contra el remoto): la política RLS de SELECT
  `store_orders_select_authenticated` aplica a `authenticated` con `using (true)`, por lo que todo
  usuario autenticado, incluida la sucursal destino, recibe los eventos. Por eso un fallo no sería
  de RLS. Causas probables restantes: la tabla no figura en `pg_publication_tables`, el canal no
  llegó a `SUBSCRIBED`, o el contexto no se montó (usuario sin sucursal activa).
- Consulta de verificación de la publicación:

```sql
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'store_orders';
```

## Registro de la prueba

| Caso           | Resultado (ok / falla) | Notas |
| -------------- | ---------------------- | ----- |
| 1. Envío       |                        |       |
| 2. Recepción   |                        |       |
| 3. Aislamiento |                        |       |
