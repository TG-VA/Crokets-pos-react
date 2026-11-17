-- set_branch_active: restaura en remoto el guard anti-suplantacion que 20261020120000 documenta.
-- La definicion remota validaba al admin con u.id = p_admin_id, asi que un usuario autenticado que
-- no es admin podia activar o desactivar sucursales pasando el UUID de un admin (KNOWN_ISSUES #90).
-- Cuerpo identico al de 20261020120000: v_admin_id := coalesce(auth.uid(), p_admin_id).
-- Misma firma; los grants se reafirman sin anon (ver 20261115150000).
-- Rollback: reaplicar la definicion remota previa (sin coalesce); no recomendado.

CREATE OR REPLACE FUNCTION public.set_branch_active(
    p_branch_id uuid,
    p_is_active boolean,
    p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_admin_is_valid boolean;
  v_admin_id uuid := coalesce(auth.uid(), p_admin_id);
  v_branch record;
  v_open_sessions bigint;
  v_in_transit_transfers bigint;
  v_active_devices bigint;
begin
  if p_branch_id is null then
    return jsonb_build_object('success', false, 'message', 'Sucursal requerida.');
  end if;

  if p_is_active is null then
    return jsonb_build_object('success', false, 'message', 'Estado requerido.');
  end if;

  select true
    into v_admin_is_valid
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = v_admin_id
    and u.status = true
    and r.name = 'admin'
  limit 1;

  if v_admin_is_valid is not true then
    return jsonb_build_object('success', false, 'message', 'El administrador no es válido.');
  end if;

  select b.id, b.code, b.name, b.is_active
    into v_branch
  from public.branches b
  where b.id = p_branch_id;

  if v_branch.id is null then
    return jsonb_build_object('success', false, 'message', 'La sucursal no existe.');
  end if;

  if v_branch.is_active = p_is_active then
    return jsonb_build_object(
      'success', true,
      'message', 'La sucursal ya se encuentra en el estado solicitado.',
      'changed', false,
      'branch', jsonb_build_object(
        'id', v_branch.id,
        'code', v_branch.code,
        'name', v_branch.name,
        'is_active', v_branch.is_active
      )
    );
  end if;

  if p_is_active = false then
    -- Bloqueo 1: sesiones de caja abiertas en la sucursal.
    select count(*)
      into v_open_sessions
    from public.cash_register_sessions crs
    where crs.branch_id = p_branch_id
      and crs.status = 'open';

    if v_open_sessions > 0 then
      return jsonb_build_object(
        'success', false,
        'message', format('No se puede desactivar: hay %s sesión(es) de caja abierta(s) en esta sucursal.', v_open_sessions),
        'blockers', jsonb_build_object('openCashSessions', v_open_sessions)
      );
    end if;

    -- Bloqueo 2: traspasos de inventario en tránsito ('pending_receipt' vigente;
    -- 'pending' cubre datos legacy anteriores a la migración de snapshots).
    select count(*)
      into v_in_transit_transfers
    from public.inventory_transfers t
    where (t.from_branch_id = p_branch_id or t.to_branch_id = p_branch_id)
      and t.status in ('pending_receipt', 'pending');

    if v_in_transit_transfers > 0 then
      return jsonb_build_object(
        'success', false,
        'message', format('No se puede desactivar: hay %s traspaso(s) de inventario en tránsito.', v_in_transit_transfers),
        'blockers', jsonb_build_object('inTransitTransfers', v_in_transit_transfers)
      );
    end if;

    -- Advertencia no bloqueante: terminales POS vinculadas.
    select count(*)
      into v_active_devices
    from public.pos_devices pd
    where pd.branch_id = p_branch_id
      and pd.is_active = true;

    update public.branches
       set is_active = false
     where id = p_branch_id;

    return jsonb_build_object(
      'success', true,
      'changed', true,
      'message', 'Sucursal desactivada. Las operaciones existentes conservan su historial.',
      'warnings', case
        when v_active_devices > 0
          then jsonb_build_object('activePosDevices', v_active_devices)
        else 'null'::jsonb
      end,
      'branch', jsonb_build_object(
        'id', v_branch.id,
        'code', v_branch.code,
        'name', v_branch.name,
        'is_active', false
      )
    );
  end if;

  update public.branches
     set is_active = true
   where id = p_branch_id;

  return jsonb_build_object(
    'success', true,
    'changed', true,
    'message', 'Sucursal reactivada correctamente.',
    'branch', jsonb_build_object(
      'id', v_branch.id,
      'code', v_branch.code,
      'name', v_branch.name,
      'is_active', true
    )
  );
end;
$$;

revoke all on function public.set_branch_active(uuid, boolean, uuid) from public, anon;
grant execute on function public.set_branch_active(uuid, boolean, uuid) to authenticated, service_role;
