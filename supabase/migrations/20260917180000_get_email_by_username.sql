-- Versiona la RPC get_email_by_username, que el login (src/pages/Login/Login.jsx) usa para
-- traducir el username local a email antes de autenticar contra Supabase Auth.
--
-- La función solo vivía en el proyecto remoto (creada ad-hoc) y no tenía un CREATE FUNCTION
-- versionado (KNOWN_ISSUES #41). La definición se capturó con pg_get_functiondef contra el
-- remoto y se reproduce aquí normalizada.
--
-- Se invoca ANTES de tener sesión, por lo que requiere EXECUTE para anon (misma excepción
-- pre-auth que get_branch_by_device, KNOWN_ISSUES #30). Es SECURITY DEFINER con search_path
-- fijo y devuelve únicamente el email de un usuario activo; nunca expone otras columnas.

create or replace function public.get_email_by_username(p_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.email
  from public.users u
  where lower(u.username) = lower(p_username)
    and u.status = true
  limit 1;
$$;

revoke all on function public.get_email_by_username(text) from public;
grant execute on function public.get_email_by_username(text) to anon, authenticated, service_role;
