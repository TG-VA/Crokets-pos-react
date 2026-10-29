-- Exige que public.users.username este siempre en minusculas y sin espacios.
--
-- Contexto: la migracion 20261029120000 normalizo los usernames existentes y
-- creo el indice unico users_username_lower_key, pero nada impedia volver a
-- guardar un username con mayusculas. Un UPDATE del propio registro no choca
-- contra ese indice, porque solo se compara contra otras filas, y la fila
-- quedaba fuera del formato que consumen authorize-admin-action y
-- get_email_by_username.
--
-- Con esta restriccion, un cliente con el codigo anterior que intente guardar
-- "CARLOS" falla con un error visible en lugar de dejar el dato inconsistente.
--
-- Reversion:
--   alter table public.users drop constraint users_username_lowercase_check;

do $$
declare
  v_invalid text;
begin
  select string_agg(format('%s (%s)', id, username), ', ')
    into v_invalid
  from public.users
  where username <> lower(btrim(username));

  if v_invalid is not null then
    raise exception
      'No se puede exigir username en minusculas: hay filas fuera del formato canonico: %. Normalizalas antes de aplicar esta migracion.',
      v_invalid;
  end if;
end;
$$;

alter table public.users
  add constraint users_username_lowercase_check
  check (username = lower(btrim(username)));
