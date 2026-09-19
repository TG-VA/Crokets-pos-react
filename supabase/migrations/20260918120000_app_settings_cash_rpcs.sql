-- RPCs de lectura/escritura del tope de apertura de caja (KNOWN_ISSUES #33):
--   1. get_cash_max_opening_amount(): lectura para la UI de caja y el panel (auth autenticado).
--   2. update_cash_max_opening_amount(p_amount numeric): escritura solo para administradores,
--      respaldada por el chequeo server-side is_admin().
--
-- Estilo: SECURITY DEFINER con `set search_path` explícito, revoke a public y grants mínimos
-- a authenticated (mismo patrón que open_cash_register en 20260914130000).

-- 1. Lectura del tope vigente ------------------------------------------------------------
create or replace function public.get_cash_max_opening_amount()
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return public._cash_max_opening_amount();
end;
$$;

revoke all on function public.get_cash_max_opening_amount() from public;
grant execute on function public.get_cash_max_opening_amount() to authenticated;

-- 2. Actualización del tope (solo admin) --------------------------------------------------
create or replace function public.update_cash_max_opening_amount(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric := coalesce(p_amount, 0);
begin
  if v_amount < 0 then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_AMOUNT',
      'message', 'El tope de apertura no puede ser negativo.'
    );
  end if;

  if not public.is_admin() then
    return jsonb_build_object(
      'success', false,
      'code', 'FORBIDDEN',
      'message', 'Solo un administrador puede modificar el tope de apertura.'
    );
  end if;

  insert into public.app_settings (key, value, description)
  values (
    'cash_register.max_opening_amount',
    to_jsonb(v_amount::text),
    'Tope de efectivo inicial permitido al abrir caja (configurable desde el panel).'
  )
  on conflict (key) do update
    set value = to_jsonb(v_amount::text),
        updated_at = now(),
        updated_by = auth.uid();

  return jsonb_build_object('success', true, 'amount', v_amount);
end;
$$;

revoke all on function public.update_cash_max_opening_amount(numeric) from public;
grant execute on function public.update_cash_max_opening_amount(numeric) to authenticated;