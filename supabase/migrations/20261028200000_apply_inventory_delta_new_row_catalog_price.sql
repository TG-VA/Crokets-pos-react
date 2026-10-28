-- Complemento de 20261028190000: el alta de una fila nueva en branch_inventory desde
-- _apply_inventory_delta usaba coalesce(p_sale_price, 0), por lo que un llamador sin precio
-- creaba la fila con sale_price = 0. Ahora cae a products.sale_price (y a 0 solo si el
-- catalogo tampoco tiene precio). El UPDATE por conflicto sigue sin tocar sale_price.
-- Unico cambio respecto a 20261028190000: el calculo de v_sale.
-- Nota de la definicion original (20261019000000): los RPCs de traspaso no pasan
-- p_movement_type; se registra como traspaso.
-- Rollback: reaplicar 20261028190000_apply_inventory_delta_keep_sale_price.sql.
-- CREATE OR REPLACE conserva los grants y atributos vigentes.

CREATE OR REPLACE FUNCTION public._apply_inventory_delta(p_branch_id uuid, p_product_id uuid, p_delta numeric, p_cost_price numeric, p_sale_price numeric, p_reason text, p_user_id uuid, p_created_at timestamp with time zone, p_movement_type text DEFAULT 'transfer'::text)
 RETURNS record
 LANGUAGE plpgsql
AS $function$
declare
    v_prev_stock    numeric := 0;
    v_new_stock     numeric;
    v_inv_id        uuid;
    v_final         record;
    v_mov_table     text;
    v_delta_int     integer;
    v_cost          numeric(14,2);
    v_sale          numeric(14,2);
    v_movement_type text;
begin
    if p_branch_id is null or p_product_id is null then
        raise exception '_apply_inventory_delta: branch_id o product_id nulos';
    end if;

    v_movement_type := coalesce(nullif(btrim(p_movement_type), ''), 'transfer');

    if v_movement_type not in
        ('sale','canceled','return','adjustment','transfer','entry') then
        raise exception '_apply_inventory_delta: movement_type invalido (%)',
            v_movement_type;
    end if;

    v_delta_int := case
        when p_delta = round(p_delta) then p_delta::integer
        else round(p_delta)::integer end;

    if v_delta_int = 0 then
        select null::uuid as inv_id, 0::numeric as prev_stock,
               0::numeric as new_stock into v_final;
        return v_final;
    end if;

    v_cost := coalesce(p_cost_price, 0)::numeric(14,2);
    -- Solo se usa al insertar una fila nueva; si el llamador no envia precio
    -- se toma el del catalogo para no crear la fila con sale_price = 0.
    v_sale := coalesce(
        nullif(p_sale_price, 0),
        (select pr.sale_price from public.products pr where pr.id = p_product_id),
        0
    )::numeric(14,2);

    select id, stock into v_inv_id, v_prev_stock
    from public.branch_inventory
    where branch_id = p_branch_id and product_id = p_product_id;

    if v_prev_stock is null then
        v_prev_stock := 0;
    end if;

    v_new_stock := v_prev_stock + v_delta_int;

    if v_new_stock < 0 then
        raise exception 'Stock insuficiente (previo=%, delta=%, nuevo=%)',
            v_prev_stock::text, v_delta_int::text, v_new_stock::text;
    end if;

    insert into public.branch_inventory (
        branch_id, product_id, stock,
        min_stock, max_stock, is_active, has_been_stocked,
        cost_price, sale_price,
        created_at, updated_at
    ) values (
        p_branch_id, p_product_id, greatest(0, v_new_stock),
        0, 0, true, true,
        v_cost, v_sale,
        p_created_at, p_created_at
    )
    on conflict (branch_id, product_id) do update
    set
        stock            = public.branch_inventory.stock + v_delta_int,
        is_active        = true,
        has_been_stocked = true,
        cost_price       = excluded.cost_price,
        updated_at       = p_created_at
    returning id into v_inv_id;

    select stock into v_new_stock
    from public.branch_inventory
    where branch_id = p_branch_id and product_id = p_product_id;

    v_mov_table := null;
    foreach v_mov_table in array
        array[
            current_setting('app.inventory_movements_table', true),
            'inventory_movements','inventory_movement',
            'stock_movements','inventory_movements_log'
        ]
    loop
        if v_mov_table is null then continue; end if;
        begin
            execute format(
                'insert into public.%I (
                    sale_id, branch_id, product_id, movement_type,
                    quantity, previous_stock, new_stock, reason,
                    user_id, created_at
                 ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
                v_mov_table
            ) using
                null::uuid,
                p_branch_id,
                p_product_id,
                v_movement_type,
                v_delta_int,
                v_prev_stock,
                v_new_stock,
                p_reason,
                p_user_id,
                p_created_at;
            exit;
        exception when others then
            v_mov_table := null;
        end;
    end loop;

    select v_inv_id as inv_id, v_prev_stock as prev_stock,
           v_new_stock as new_stock into v_final;
    return v_final;
end;
$function$;
