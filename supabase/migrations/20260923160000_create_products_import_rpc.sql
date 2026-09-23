-- KNOWN_ISSUES.md #5: Importacion Masiva migrada a RPC atomica.
-- Reemplaza las transacciones compensatorias del frontend (productsImportService.js) por
-- un Stored Procedure atomico: si algo falla, PostgreSQL revierte toda la transaccion (ACID nativo).
-- Sin bloques try/catch de rollback en el cliente: productos + branch_inventory se insertan
-- juntos o no se inserta nada.

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
    v_branch              record;
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
    v_is_current_branch   boolean;
    v_stock               numeric;
    v_min_stock           numeric;
    v_max_stock           numeric;
    v_has_been_stocked    boolean;
    v_created_products    integer := 0;
    v_created_inventories integer := 0;
begin
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
            coalesce((v_product ->> 'status')::boolean, true),
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

            if v_is_global then
                for v_branch in select * from jsonb_array_elements(coalesce(p_all_branches, '[]'::jsonb)) loop
                    v_is_current_branch := (v_branch.value ->> 'id')::uuid = p_branch_id;

                    insert into public.branch_inventory (
                        branch_id, product_id, stock, min_stock, max_stock, is_active,
                        cost_price, sale_price, has_been_stocked
                    ) values (
                        (v_branch.value ->> 'id')::uuid, v_product_id,
                        case when v_is_current_branch then v_stock else 0 end,
                        case when v_is_current_branch then v_min_stock else 0 end,
                        case when v_is_current_branch then v_max_stock else 0 end,
                        true,
                        v_cost_price, v_sale_price,
                        case when v_is_current_branch then v_has_been_stocked else false end
                    );

                    v_created_inventories := v_created_inventories + 1;
                end loop;
            else
                insert into public.branch_inventory (
                    branch_id, product_id, stock, min_stock, max_stock, is_active,
                    cost_price, sale_price, has_been_stocked
                ) values (
                    p_branch_id, v_product_id, v_stock, v_min_stock, v_max_stock,
                    true, v_cost_price, v_sale_price, v_has_been_stocked
                );

                v_created_inventories := v_created_inventories + 1;
            end if;
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
