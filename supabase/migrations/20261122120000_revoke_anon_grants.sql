-- Quita a anon el acceso a public, salvo lo que el login necesita antes de la sesion.
-- Los default privileges de Supabase daban a anon todos los privilegios (incluido
-- truncate) en cada tabla, vista, secuencia y funcion de public. En las tablas sin RLS
-- (customers, products, cash_cuts, invoices, system_settings, audit_logs, etc.)
-- cualquiera con la clave publica del instalador podia leer, modificar o vaciar los
-- datos sin iniciar sesion.
--
-- 1. Revoca todo a anon en tablas, vistas y secuencias de public.
-- 2. Revoca execute a anon y PUBLIC en las funciones de public. Las funciones con
--    execute para PUBLIC ya tienen grant explicito para authenticated y service_role,
--    asi que la sesion iniciada no pierde acceso.
-- 3. Vuelve a otorgar a anon solo lo que Login.jsx y la activacion del dispositivo leen
--    antes de signInWithPassword:
--    - branches: lista de sucursales activas y datos de la sucursal del dispositivo.
--    - users (id, username): validar que el usuario existe y nombrar al que tiene la
--      sesion abierta.
--    - user_sessions (id, user_id, branch_id, status, ended_at): sesion activa del POS.
--    - get_email_by_username, get_branch_by_device y register_pos_device.
-- 4. Las tablas, secuencias y funciones nuevas que cree postgres ya no nacen con
--    privilegios para anon ni execute para PUBLIC.
--
-- authenticated y service_role no cambian. Las edge functions usan service role o el
-- JWT del usuario y no dependen de anon.
--
-- Rollback:
--   grant all on all tables in schema public to anon;
--   grant all on all sequences in schema public to anon;
--   grant execute on all functions in schema public to anon, public;
--   alter default privileges for role postgres in schema public grant all on tables to anon;
--   alter default privileges for role postgres in schema public grant all on sequences to anon;
--   alter default privileges for role postgres in schema public grant execute on functions to anon, public;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon, public;

grant select on table public.branches to anon;
grant select (id, username) on table public.users to anon;
grant select (id, user_id, branch_id, status, ended_at) on table public.user_sessions to anon;

grant execute on function public.get_email_by_username(text) to anon;
grant execute on function public.get_branch_by_device(text) to anon;
grant execute on function public.register_pos_device(text, uuid, uuid) to anon;

alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke execute on functions from anon, public;
