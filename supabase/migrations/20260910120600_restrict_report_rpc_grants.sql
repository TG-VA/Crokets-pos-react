-- Restringe la ejecución de los RPCs de reportes a usuarios autenticados.
-- Antes concedían EXECUTE a anon (público): con RLS USING(true) en varias tablas
-- de datos (ver KNOWN_ISSUES #13), un llamador sin sesión podría invocar los
-- reportes de caja/comisiones/inventario. Los clientes de la app llaman estos
-- RPCs siempre con sesión (AuthContext), por lo que revocar anon no afecta el
-- flujo actual.

REVOKE EXECUTE ON FUNCTION public.get_cash_report_sessions(uuid, timestamptz, timestamptz, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_commissions_report_data(timestamptz, timestamptz, uuid, uuid, uuid, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_inventory_report_data(uuid) FROM anon;