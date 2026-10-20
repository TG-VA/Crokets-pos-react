-- Gestión corporativa de sucursales: bandera is_active + RPCs de alta y cambio de estado.
--
-- Contexto: hasta ahora "una sucursal existe o no" (comentario histórico en
-- register_pos_device). Se agrega soft delete vía is_active para que el catálogo
-- pueda deshabilitar sucursales con historial operativo sin romper integridad
-- referencial ni fiscal (ventas, cajas, traspasos e inventario histórico).
--
-- Regla de negocio: NUNCA se elimina físicamente una sucursal con historial.
--
-- create_branch: alta transaccional con validación de unicidad (code, name).
-- set_branch_active: activa/desactiva con bloqueos operativos (sesiones de caja
-- abiertas, traspasos en tránsito) y advertencia de terminales POS vinculadas.
--
-- Ambas RPCs validan que p_admin_id sea un usuario activo con rol 'admin'
-- (mismo patrón de elevación contenido que register_pos_device).

-- -----------------------------------------------------------------------------
-- 1. Columna is_active + índice
-- -----------------------------------------------------------------------------
ALTER TABLE public.branches
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_branches_is_active
    ON public.branches(is_active);

COMMENT ON COLUMN public.branches.is_active IS
    'Soft delete corporativo. Sucursales inactivas no se ofrecen en operaciones
     nuevas (login/selector de sucursal/traspasos) pero permanecen en reportes
     históricos. No se permite borrado físico con historial operativo.';

-- -----------------------------------------------------------------------------
-- 2. create_branch: alta con unicidad validada
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_branch(
    p_code text,
    p_name text,
    p_admin_id uuid,
    p_phone text DEFAULT NULL,
    p_email text DEFAULT NULL,
    p_address text DEFAULT NULL,
    p_city text DEFAULT NULL,
    p_state text DEFAULT NULL,
    p_timezone text DEFAULT 'America/Cancun'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_admin_is_valid boolean;
  v_existing record;
  v_branch record;
begin
  if p_code is null or btrim(p_code) = '' then
    return jsonb_build_object('success', false, 'message', 'El código de la sucursal es obligatorio.');
  end if;

  if p_name is null or btrim(p_name) = '' then
    return jsonb_build_object('success', false, 'message', 'El nombre de la sucursal es obligatorio.');
  end if;

  select true
    into v_admin_is_valid
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = p_admin_id
    and u.status = true
    and r.name = 'admin'
  limit 1;

  if v_admin_is_valid is not true then
    return jsonb_build_object('success', false, 'message', 'El administrador no es válido.');
  end if;

  select b.id, 'code' as conflict
    into v_existing
  from public.branches b
  where b.code = btrim(p_code)
  limit 1;

  if v_existing.id is not null then
    return jsonb_build_object('success', false, 'message', 'Ya existe una sucursal con ese código.');
  end if;

  select b.id, 'name' as conflict
    into v_existing
  from public.branches b
  where lower(b.name) = lower(btrim(p_name))
  limit 1;

  if v_existing.id is not null then
    return jsonb_build_object('success', false, 'message', 'Ya existe una sucursal con ese nombre.');
  end if;

  insert into public.branches (code, name, phone, email, address, city, state, timezone, is_active)
  values (
    btrim(p_code),
    btrim(p_name),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(coalesce(p_email, '')), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    nullif(btrim(coalesce(p_city, '')), ''),
    nullif(btrim(coalesce(p_state, '')), ''),
    coalesce(nullif(btrim(coalesce(p_timezone, '')), ''), 'America/Cancun'),
    true
  )
  returning id, code, name, phone, email, address, city, state, timezone, is_active
    into v_branch;

  return jsonb_build_object(
    'success', true,
    'message', 'Sucursal creada correctamente.',
    'branch', to_jsonb(v_branch)
  );
end;
$$;

revoke all on function public.create_branch(text, text, uuid, text, text, text, text, text, text) from public;
grant execute on function public.create_branch(text, text, uuid, text, text, text, text, text, text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. set_branch_active: activación / desactivación con bloqueos operativos
-- -----------------------------------------------------------------------------
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
  where u.id = p_admin_id
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

revoke all on function public.set_branch_active(uuid, boolean, uuid) from public;
grant execute on function public.set_branch_active(uuid, boolean, uuid) to authenticated, service_role;
