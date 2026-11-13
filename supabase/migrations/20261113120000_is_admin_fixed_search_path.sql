-- public.is_admin(): fija search_path y califica public.users / public.roles.
-- Lo usan como guard varias funciones SECURITY DEFINER (importar productos, promover a global,
-- tope de caja) y la politica RLS user_branches_admin_write. Sin search_path fijo, la resolucion
-- de users/roles dependia del search_path de quien llama.
-- Sin cambios: LANGUAGE sql, STABLE, SECURITY INVOKER, misma logica y mismos grants.
-- El grant a anon se conserva: user_branches_admin_write aplica a public, y sin EXECUTE las
-- consultas de anon a user_branches fallarian en lugar de devolver cero filas.
-- Rollback: reaplicar la definicion de 00000000000000_remote_schema_baseline.sql (sin SET search_path).

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.id = auth.uid()
      and u.status = true
      and r.name = 'admin'
  );
$$;
