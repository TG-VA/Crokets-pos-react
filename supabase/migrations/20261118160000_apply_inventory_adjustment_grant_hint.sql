-- Hint estable para el rechazo por autorizacion de administrador ausente o vencida
-- en `apply_inventory_adjustment` (Inventario > Ajustes).
-- Motivo: el cliente distinguia ese 42501 de la falta de acceso a la sucursal
-- comparando el texto del mensaje; corregir la redaccion en SQL rompia el modal de
-- reautorizacion. Ahora el raise lleva `hint = 'ADMIN_GRANT_REQUIRED'`, igual que
-- INVENTORY_NOT_REGISTERED y NEGATIVE_STOCK. El resto de la funcion es identico a
-- 20261118150000 (mismos permisos, bloqueo, validaciones y movimiento).
-- Despliegue: aplicar antes del frontend que compara `error.hint`. El cliente
-- conserva un fallback por mensaje para la version sin hint.
-- Rollback: reaplicar la definicion de 20261118150000_apply_inventory_adjustment_rpc.sql.

create or replace function public.apply_inventory_adjustment(
  p_branch_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_reason text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_row record;
  v_previous numeric;
  v_new_stock numeric;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_notes text := btrim(coalesce(p_notes, ''));
  v_local_now timestamp;
begin
  if v_actor is null and auth.role() <> 'service_role' then
    raise exception 'Se requiere un usuario autenticado para ajustar inventario.';
  end if;

  if p_branch_id is null then
    raise exception 'No hay una sucursal activa para aplicar el ajuste.';
  end if;

  if p_product_id is null then
    raise exception 'No se detectó el identificador del producto.';
  end if;

  if v_actor is not null
    and not public._user_can_access_branch(p_branch_id) then
    raise exception 'No tienes acceso a esta sucursal.'
      using errcode = '42501';
  end if;

  if v_actor is not null
    and not public.is_admin()
    and not exists (
      select 1
      from public.admin_action_grants g
      where g.granted_to = v_actor
        and g.action = 'inventory_adjust_access'
        and g.branch_id = p_branch_id
        and g.expires_at > now()
    ) then
    raise exception 'Ajustar inventario requiere la autorizacion de un administrador.'
      using errcode = '42501', hint = 'ADMIN_GRANT_REQUIRED';
  end if;

  if p_quantity is null
    or p_quantity in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric) then
    raise exception 'La diferencia no es un numero valido.';
  end if;

  if p_quantity = 0 then
    raise exception 'La diferencia debe ser distinta de 0.';
  end if;

  if p_quantity <> trunc(p_quantity) then
    raise exception 'La diferencia debe ser un numero entero.';
  end if;

  if v_reason = '' then
    raise exception 'Captura el motivo del ajuste.';
  end if;

  select now() at time zone coalesce(b.timezone, 'America/Cancun')
  into v_local_now
  from public.branches b
  where b.id = p_branch_id;

  v_local_now := coalesce(v_local_now, now() at time zone 'America/Cancun');

  perform pg_advisory_xact_lock(hashtext('branch_inventory:' || p_product_id::text));

  select stock
  into v_row
  from public.branch_inventory
  where branch_id = p_branch_id and product_id = p_product_id
  for update;

  if not found then
    raise exception 'Este producto aún no existe en el inventario de la sucursal. Primero agrégalo en Inventario > Agregar.'
      using hint = 'INVENTORY_NOT_REGISTERED';
  end if;

  v_previous := coalesce(v_row.stock, 0);
  v_new_stock := v_previous + p_quantity;

  if v_new_stock < 0 then
    raise exception E'No puedes dejar el stock en negativo.\n\nStock actual: %\nAjuste: %\nResultado: %',
      round(v_previous)::integer,
      round(p_quantity)::integer,
      round(v_new_stock)::integer
      using hint = 'NEGATIVE_STOCK';
  end if;

  update public.branch_inventory
  set stock = v_new_stock,
      is_active = true,
      has_been_stocked = true,
      updated_at = now()
  where branch_id = p_branch_id and product_id = p_product_id;

  insert into public.inventory_movements (
    branch_id,
    product_id,
    movement_type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    user_id,
    created_at
  )
  values (
    p_branch_id,
    p_product_id,
    'adjustment',
    round(p_quantity)::integer,
    round(v_previous)::integer,
    round(v_new_stock)::integer,
    case when v_notes = '' then v_reason else v_reason || ' - ' || v_notes end,
    v_actor,
    v_local_now
  );

  return jsonb_build_object(
    'success', true,
    'productId', p_product_id,
    'previousStock', v_previous,
    'newStock', v_new_stock,
    'quantity', p_quantity
  );
end;
$$;

revoke all on function public.apply_inventory_adjustment(uuid, uuid, numeric, text, text) from public, anon;
grant execute on function public.apply_inventory_adjustment(uuid, uuid, numeric, text, text) to authenticated, service_role;
