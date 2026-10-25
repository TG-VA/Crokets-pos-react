-- Publica store_orders en supabase_realtime para que la pantalla de pedidos y
-- el contador del navbar se actualicen sin recargar. Realtime respeta RLS:
-- cada usuario solo recibe eventos de los pedidos que puede leer.
-- Idempotente: no falla si la tabla ya esta publicada.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'store_orders'
  ) then
    alter publication supabase_realtime add table public.store_orders;
  end if;
end
$$;
