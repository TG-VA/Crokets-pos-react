-- Escritura de usuarios y roles solo para administradores.
-- users, roles, role_permissions, permissions y user_roles tenian RLS deshabilitado y
-- grants de insert/update/delete para anon y authenticated: cualquiera con la clave
-- publica podia cambiar el role_id de un usuario y volverse administrador, saltando
-- is_admin() y todo control que dependa de el.
-- 1. Revoca insert/update/delete/truncate a anon y authenticated en las cinco tablas.
--    Se conserva select: login, reportes y permisos leen estas tablas.
-- 2. Las dos escrituras de Configuracion > Usuarios pasan a RPCs que exigen is_admin().
--    Un administrador no puede quitarse su propio rol ni desactivarse, para no dejar la
--    sucursal sin administrador por error.
-- Las edge functions (admin-create-user, admin-reset-user-password,
-- authorize-admin-action) usan service role y no se ven afectadas.
-- Rollback:
--   grant insert, update, delete, truncate on table public.users, public.roles,
--     public.role_permissions, public.permissions, public.user_roles to anon, authenticated;
--   drop function public.admin_update_user(uuid, text, text, uuid);
--   drop function public.admin_set_user_status(uuid, boolean);

revoke insert, update, delete, truncate on table public.users from anon, authenticated;
revoke insert, update, delete, truncate on table public.roles from anon, authenticated;
revoke insert, update, delete, truncate on table public.role_permissions from anon, authenticated;
revoke insert, update, delete, truncate on table public.permissions from anon, authenticated;
revoke insert, update, delete, truncate on table public.user_roles from anon, authenticated;

create or replace function public.admin_update_user(
  p_user_id uuid,
  p_name text default null,
  p_username text default null,
  p_role_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role_name text;
  v_user public.users;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede editar usuarios.'
      using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'Falta el identificador del usuario.';
  end if;

  if p_role_id is not null then
    select r.name into v_role_name from public.roles r where r.id = p_role_id;

    if v_role_name is null then
      raise exception 'El rol seleccionado no existe.';
    end if;

    if p_user_id = auth.uid() and v_role_name <> 'admin' then
      raise exception 'No puedes quitarte el rol de administrador.';
    end if;
  end if;

  update public.users u
     set name = case when p_name is null then u.name else btrim(p_name) end,
         username = case
           when p_username is null then u.username
           else lower(btrim(p_username))
         end,
         role_id = coalesce(p_role_id, u.role_id),
         updated_at = now()
   where u.id = p_user_id
  returning u.* into v_user;

  if v_user.id is null then
    raise exception 'El usuario no existe.';
  end if;

  return jsonb_build_object(
    'id', v_user.id,
    'name', v_user.name,
    'username', v_user.username,
    'email', v_user.email,
    'status', v_user.status,
    'role_id', v_user.role_id,
    'created_at', v_user.created_at
  );
end;
$function$;

create or replace function public.admin_set_user_status(
  p_user_id uuid,
  p_status boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user public.users;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede activar o desactivar usuarios.'
      using errcode = '42501';
  end if;

  if p_user_id is null or p_status is null then
    raise exception 'Datos insuficientes para cambiar el estado del usuario.';
  end if;

  if p_user_id = auth.uid() and p_status = false then
    raise exception 'No puedes desactivar tu propio usuario.';
  end if;

  update public.users u
     set status = p_status,
         updated_at = now()
   where u.id = p_user_id
  returning u.* into v_user;

  if v_user.id is null then
    raise exception 'El usuario no existe.';
  end if;

  return jsonb_build_object(
    'id', v_user.id,
    'name', v_user.name,
    'username', v_user.username,
    'email', v_user.email,
    'status', v_user.status,
    'role_id', v_user.role_id,
    'created_at', v_user.created_at
  );
end;
$function$;

revoke all on function public.admin_update_user(uuid, text, text, uuid) from public, anon;
revoke all on function public.admin_set_user_status(uuid, boolean) from public, anon;
grant execute on function public.admin_update_user(uuid, text, text, uuid) to authenticated;
grant execute on function public.admin_set_user_status(uuid, boolean) to authenticated;
