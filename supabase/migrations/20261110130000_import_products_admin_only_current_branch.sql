-- import_products_transaction: solo administradores y el inventario se crea unicamente
-- en la sucursal actual.
-- 1. Valida public.is_admin() (usuario activo con rol admin en la sesion). Antes cualquier
--    usuario autenticado podia invocarla fuera de la app.
-- 2. Un producto global ya no crea filas de branch_inventory con stock 0 en todas las
--    sucursales: igual que createProduct, solo se crea en p_branch_id. Las demas sucursales
--    lo ven por products.is_global. p_all_branches se conserva en la firma por
--    compatibilidad y se ignora.
-- Rollback: reaplicar 20261110120000_import_products_inventory_follows_status.sql.

CREATE OR REPLACE FUNCTION public.import_products_transaction(
    p_rows jsonb,
    p_branch_id uuid,
    p_all_branches jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_row                 jsonb;
    v_product             jsonb;
    v_inventory           jsonb;
    v_product_id          uuid;
    v_barcode             text;
    v_name                text;
    v_sale_type           text;
    v_unit                text;
    v_cost_price          numeric;
    v_sale_price          numeric;
    v_tax                 numeric;
    v_tracks_inventory    boolean;
    v_is_global           boolean;
    v_status              boolean;
    v_stock               numeric;
    v_min_stock           numeric;
    v_max_stock           numeric;
    v_has_been_stocked    boolean;
    v_created_products    integer := 0;
    v_created_inventories integer := 0;
begin
    if not public.is_admin() then
        raise exception 'Solo un administrador puede importar productos.';
    end if;

    if p_rows is null or jsonb_array_length(p_rows) = 0 then
        return jsonb_build_object('created_products_count', 0, 'created_inventories_count', 0);
    end if;

    for v_row in select * from jsonb_array_elements(p_rows) loop
        v_product   := v_row -> 'product';
        v_inventory := v_row -> 'inventory';

        v_barcode          := btrim(coalesce(v_product ->> 'barcode', ''));
        v_name             := btrim(coalesce(v_product ->> 'name', ''));
        v_sale_type        := coalesce(v_product ->> 'sale_type', 'unidad');
        v_unit             := coalesce(v_product ->> 'unit', 'pieza');
        v_cost_price       := coalesce((v_product ->> 'cost_price')::numeric, 0);
        v_sale_price       := coalesce((v_product ->> 'sale_price')::numeric, 0);
        v_tax              := coalesce((v_product ->> 'tax')::numeric, 16);
        v_tracks_inventory := coalesce((v_product ->> 'tracks_inventory')::boolean, false);
        v_is_global        := coalesce((v_product ->> 'is_global')::boolean, true);
        v_status           := coalesce((v_product ->> 'status')::boolean, true);

        if v_barcode = '' then
            raise exception 'El código de barras del producto es obligatorio.';
        end if;
        if v_name = '' then
            raise exception 'El nombre del producto es obligatorio.';
        end if;

        insert into public.products (
            barcode, name, sale_type, department_id, unit, cost_price, sale_price,
            tax, commission_enabled, commission_percent, commission_type, commission_value,
            clave_sat, status, is_global, is_kit, tracks_inventory
        ) values (
            v_barcode, v_name, v_sale_type, (v_product ->> 'department_id')::uuid, v_unit,
            v_cost_price, v_sale_price, v_tax,
            coalesce((v_product ->> 'commission_enabled')::boolean, false),
            coalesce((v_product ->> 'commission_percent')::numeric, 0),
            coalesce(v_product ->> 'commission_type', 'percent'),
            coalesce((v_product ->> 'commission_value')::numeric, 0),
            v_product ->> 'clave_sat',
            v_status,
            v_is_global,
            coalesce((v_product ->> 'is_kit')::boolean, false),
            v_tracks_inventory
        )
        returning id into v_product_id;

        v_created_products := v_created_products + 1;

        if v_tracks_inventory then
            v_stock            := coalesce((v_inventory ->> 'stock')::numeric, 0);
            v_min_stock        := coalesce((v_inventory ->> 'min_stock')::numeric, 0);
            v_max_stock        := coalesce((v_inventory ->> 'max_stock')::numeric, 0);
            v_has_been_stocked := coalesce((v_inventory ->> 'has_been_stocked')::boolean, false);

            insert into public.branch_inventory (
                branch_id, product_id, stock, min_stock, max_stock, is_active,
                cost_price, sale_price, has_been_stocked
            ) values (
                p_branch_id, v_product_id, v_stock, v_min_stock, v_max_stock,
                v_status, v_cost_price, v_sale_price, v_has_been_stocked
            );

            v_created_inventories := v_created_inventories + 1;
        end if;
    end loop;

    return jsonb_build_object(
        'created_products_count', v_created_products,
        'created_inventories_count', v_created_inventories
    );

exception when others then
    raise exception 'import_products_transaction: % (SQLSTATE=%)', sqlerrm, sqlstate;
end;
$function$;

REVOKE ALL ON FUNCTION public.import_products_transaction(p_rows jsonb, p_branch_id uuid, p_all_branches jsonb) FROM public;
REVOKE ALL ON FUNCTION public.import_products_transaction(p_rows jsonb, p_branch_id uuid, p_all_branches jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.import_products_transaction(p_rows jsonb, p_branch_id uuid, p_all_branches jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_products_transaction(p_rows jsonb, p_branch_id uuid, p_all_branches jsonb) TO service_role;
