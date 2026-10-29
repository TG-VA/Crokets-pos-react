-- Normaliza public.users.username a minusculas y garantiza unicidad sin
-- distinguir mayusculas.
--
-- Contexto: la edicion de usuarios guardaba el username en mayusculas y el alta
-- lo guardaba tal como se capturaba, mientras que la edge function
-- authorize-admin-action lo buscaba en minusculas con una comparacion sensible.
-- Por eso los administradores CARLOS, GAEL y BRENDA no podian autorizar la
-- vinculacion de una sucursal nueva.
--
-- Reversion: el casing original no se puede restaurar porque no se guarda en
-- ninguna columna auxiliar y esta migracion lo descarta. Para revertir el
-- comportamiento alcanza con ejecutar:
--   drop index if exists public.users_username_lower_key;
-- y volver a desplegar las versiones anteriores de las edge functions. Los
-- usernames quedan en minusculas de forma permanente; hoy son 7 usuarios y el
-- casing visual no tiene valor funcional.
--
-- El UNIQUE existente users_username_key se conserva para no romper
-- dependencias; el indice nuevo agrega la garantia insensible a mayusculas.

do $$
declare
  v_collisions text;
begin
  select string_agg(format('%s (%s usuarios)', c.username, c.total), ', ')
    into v_collisions
  from (
    select lower(btrim(username)) as username, count(*) as total
    from public.users
    group by lower(btrim(username))
    having count(*) > 1
  ) c;

  if v_collisions is not null then
    raise exception
      'No se puede normalizar users.username: hay colisiones al ignorar mayusculas y espacios: %. Resuelvelas manualmente antes de aplicar esta migracion.',
      v_collisions;
  end if;
end;
$$;

update public.users
set username = lower(btrim(username))
where username <> lower(btrim(username));

create unique index if not exists users_username_lower_key
  on public.users (lower(username));
