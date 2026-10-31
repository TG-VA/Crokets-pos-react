-- RPC promote_product_to_global: un producto con is_global NULL se trata como
-- no global (igual que store_orders y el frontend), por lo que se puede promover
-- en lugar de rechazarse como ya global.
-- Rollback: reaplicar 20261031120000_promote_product_to_global.sql.

create or replace function public.promote_product_to_global(p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
begin
  if not public.is_admin() then
    return jsonb_build_object(
      'success', false,
      'code', 'FORBIDDEN',
      'message', 'Solo un administrador puede volver global un producto.'
    );
  end if;

  select * into v_product from public.products where id = p_product_id for update;

  if not found or v_product.status is distinct from true then
    return jsonb_build_object(
      'success', false,
      'code', 'NOT_FOUND',
      'message', 'El producto no existe o esta inactivo.'
    );
  end if;

  if coalesce(v_product.is_kit, false) then
    return jsonb_build_object(
      'success', false,
      'code', 'IS_KIT',
      'message', 'Los kits no se pueden volver globales.'
    );
  end if;

  if coalesce(v_product.is_global, false) then
    return jsonb_build_object(
      'success', false,
      'code', 'ALREADY_GLOBAL',
      'message', 'El producto ya es global.'
    );
  end if;

  update public.products
     set is_global = true,
         updated_at = now()
   where id = p_product_id;

  insert into public.audit_logs (user_id, entity, entity_id, action, description, old_values, new_values)
  values (
    auth.uid(),
    'product',
    p_product_id,
    'promote_to_global',
    left('Producto local vuelto global: ' || v_product.name, 255),
    jsonb_build_object('is_global', false),
    jsonb_build_object('is_global', true)
  );

  return jsonb_build_object('success', true, 'product_id', p_product_id);
end;
$$;

revoke all on function public.promote_product_to_global(uuid) from public;
revoke all on function public.promote_product_to_global(uuid) from anon;
grant execute on function public.promote_product_to_global(uuid) to authenticated;
