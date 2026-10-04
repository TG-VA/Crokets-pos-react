-- KNOWN_ISSUES.md #5: Kits de Productos migrado a RPCs atómicas.
-- Reemplaza las transacciones compensatorias del frontend (productKitsService.js) por
-- Stored Procedures atomicos: si algo falla, PostgreSQL revierte toda la transaccion (ACID nativo).

CREATE OR REPLACE FUNCTION public.create_kit_transaction(p_kit_product jsonb, p_kit_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_now                  timestamptz := now();
    v_barcode              text;
    v_name                 text;
    v_sale_price           numeric;
    v_max_kits             integer;
    v_kit_product_id       uuid;
    v_kit_id               uuid;
    v_item                 record;
    v_idx                  integer := 0;
    v_component_product_id uuid;
    v_quantity             numeric;
begin
    v_barcode    := btrim(coalesce(p_kit_product ->> 'barcode', ''));
    v_name       := btrim(coalesce(p_kit_product ->> 'name', p_kit_product ->> 'description', ''));
    v_sale_price := coalesce((p_kit_product ->> 'sale_price')::numeric, (p_kit_product ->> 'price')::numeric, 0);
    v_max_kits   := coalesce((p_kit_product ->> 'max_kits_per_sale')::integer, 1);

    if v_barcode = '' then
        raise exception 'El código de barras del kit es obligatorio.';
    end if;
    if v_name = '' then
        raise exception 'La descripción del kit es obligatoria.';
    end if;
    if v_sale_price <= 0 then
        raise exception 'El precio del kit debe ser mayor a 0.';
    end if;
    if v_max_kits < 1 then
        raise exception 'El límite de venta del kit debe ser mayor o igual a 1.';
    end if;
    if p_kit_items is null or jsonb_array_length(p_kit_items) = 0 then
        raise exception 'Agrega al menos un producto al kit.';
    end if;

    insert into public.products (
        barcode, name, sale_type, department_id, unit, cost_price, sale_price,
        tax, commission_enabled, commission_percent, clave_sat, status, is_global,
        is_kit, tracks_inventory, created_at, updated_at, max_kits_per_sale
    ) values (
        v_barcode, v_name, 'unidad', null, 'pieza', 0, v_sale_price,
        16, false, 0, null, true, true,
        true, false, v_now, v_now, v_max_kits
    )
    returning id into v_kit_product_id;

    insert into public.product_kits (kit_product_id, is_active, created_at, updated_at)
    values (v_kit_product_id, true, v_now, v_now)
    returning id into v_kit_id;

    for v_item in select * from jsonb_array_elements(p_kit_items) loop
        v_idx := v_idx + 1;
        v_component_product_id := coalesce(
            (v_item.value ->> 'component_product_id')::uuid,
            (v_item.value ->> 'product_id')::uuid,
            (v_item.value ->> 'id')::uuid
        );
        v_quantity := coalesce((v_item.value ->> 'quantity')::numeric, 0);

        if v_component_product_id is null then
            raise exception 'Producto inválido en la línea % del kit.', v_idx;
        end if;
        if v_quantity <= 0 then
            raise exception 'Cantidad inválida en la línea % del kit.', v_idx;
        end if;

        insert into public.product_kit_items (kit_id, component_product_id, quantity, created_at)
        values (v_kit_id, v_component_product_id, v_quantity, v_now);
    end loop;

    return v_kit_id;

exception when others then
    raise exception 'create_kit_transaction: % (SQLSTATE=%)', sqlerrm, sqlstate;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_kit_transaction(p_kit_id uuid, p_kit_product_id uuid, p_kit_product jsonb, p_kit_items jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_now                  timestamptz := now();
    v_barcode              text;
    v_name                 text;
    v_sale_price           numeric;
    v_max_kits             integer;
    v_item                 record;
    v_idx                  integer := 0;
    v_component_product_id uuid;
    v_quantity             numeric;
begin
    if p_kit_id is null then
        raise exception 'El identificador del kit es requerido.';
    end if;
    if p_kit_product_id is null then
        raise exception 'El producto del kit es requerido.';
    end if;

    v_barcode    := btrim(coalesce(p_kit_product ->> 'barcode', ''));
    v_name       := btrim(coalesce(p_kit_product ->> 'name', p_kit_product ->> 'description', ''));
    v_sale_price := coalesce((p_kit_product ->> 'sale_price')::numeric, (p_kit_product ->> 'price')::numeric, 0);
    v_max_kits   := coalesce((p_kit_product ->> 'max_kits_per_sale')::integer, 1);

    if v_barcode = '' then
        raise exception 'El código de barras del kit es obligatorio.';
    end if;
    if v_name = '' then
        raise exception 'La descripción del kit es obligatoria.';
    end if;
    if v_sale_price <= 0 then
        raise exception 'El precio del kit debe ser mayor a 0.';
    end if;
    if v_max_kits < 1 then
        raise exception 'El límite de venta del kit debe ser mayor o igual a 1.';
    end if;
    if p_kit_items is null or jsonb_array_length(p_kit_items) = 0 then
        raise exception 'Agrega al menos un producto al kit.';
    end if;

    update public.products
       set barcode = v_barcode,
           name = v_name,
           sale_price = v_sale_price,
           max_kits_per_sale = v_max_kits,
           updated_at = v_now
     where id = p_kit_product_id;

    update public.product_kits
       set updated_at = v_now
     where id = p_kit_id;

    delete from public.product_kit_items
     where kit_id = p_kit_id;

    for v_item in select * from jsonb_array_elements(p_kit_items) loop
        v_idx := v_idx + 1;
        v_component_product_id := coalesce(
            (v_item.value ->> 'component_product_id')::uuid,
            (v_item.value ->> 'product_id')::uuid,
            (v_item.value ->> 'id')::uuid
        );
        v_quantity := coalesce((v_item.value ->> 'quantity')::numeric, 0);

        if v_component_product_id is null then
            raise exception 'Producto inválido en la línea % del kit.', v_idx;
        end if;
        if v_quantity <= 0 then
            raise exception 'Cantidad inválida en la línea % del kit.', v_idx;
        end if;

        insert into public.product_kit_items (kit_id, component_product_id, quantity, created_at)
        values (p_kit_id, v_component_product_id, v_quantity, v_now);
    end loop;

    return true;

exception when others then
    raise exception 'update_kit_transaction: % (SQLSTATE=%)', sqlerrm, sqlstate;
end;
$function$;

CREATE OR REPLACE FUNCTION public.delete_kit_transaction(p_kit_id uuid, p_kit_product_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_now timestamptz := now();
begin
    if p_kit_id is null then
        raise exception 'El identificador del kit es requerido.';
    end if;
    if p_kit_product_id is null then
        raise exception 'El producto del kit es requerido.';
    end if;

    update public.products
       set status = false,
           updated_at = v_now
     where id = p_kit_product_id;

    update public.product_kits
       set is_active = false,
           updated_at = v_now
     where id = p_kit_id;

    return true;

exception when others then
    raise exception 'delete_kit_transaction: % (SQLSTATE=%)', sqlerrm, sqlstate;
end;
$function$;

REVOKE ALL ON FUNCTION public.create_kit_transaction(p_kit_product jsonb, p_kit_items jsonb) FROM public;
REVOKE ALL ON FUNCTION public.create_kit_transaction(p_kit_product jsonb, p_kit_items jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_kit_transaction(p_kit_product jsonb, p_kit_items jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_kit_transaction(p_kit_product jsonb, p_kit_items jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.update_kit_transaction(p_kit_id uuid, p_kit_product_id uuid, p_kit_product jsonb, p_kit_items jsonb) FROM public;
REVOKE ALL ON FUNCTION public.update_kit_transaction(p_kit_id uuid, p_kit_product_id uuid, p_kit_product jsonb, p_kit_items jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_kit_transaction(p_kit_id uuid, p_kit_product_id uuid, p_kit_product jsonb, p_kit_items jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_kit_transaction(p_kit_id uuid, p_kit_product_id uuid, p_kit_product jsonb, p_kit_items jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.delete_kit_transaction(p_kit_id uuid, p_kit_product_id uuid) FROM public;
REVOKE ALL ON FUNCTION public.delete_kit_transaction(p_kit_id uuid, p_kit_product_id uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_kit_transaction(p_kit_id uuid, p_kit_product_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_kit_transaction(p_kit_id uuid, p_kit_product_id uuid) TO service_role;
