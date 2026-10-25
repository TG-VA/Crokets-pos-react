-- receive_transfer_order usaba el estatus 'processing_receipt', que no permite
-- inventory_transfers_status_ck. Se conserva 'pending_receipt': el UPDATE
-- condicional mantiene el bloqueo de fila hasta el commit, asi que una
-- recepcion concurrente sigue sin poder duplicarse.
CREATE OR REPLACE FUNCTION public.receive_transfer_order(p_transfer_id uuid, p_destination_branch uuid, p_user_id uuid, p_username text, p_received_qty_map jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_transfer       record;
    v_origin_br_id   uuid;
    v_dest_br_id     uuid;
    v_status         text;
    v_raw_notes      text;
    v_note_text      text;
    v_meta           jsonb;
    v_sep_idx        integer;
    v_folio          text;
    v_origin_name    text;
    v_dest_name      text;
    v_database_ts    timestamptz := now();
    v_item           record;
    v_product_id     uuid;
    v_item_name      text;
    v_req_qty        integer;
    v_cost_price     numeric;
    v_sale_price     numeric;
    v_parsed_rq      numeric;
    v_received_qty   integer;
    v_returned_qty   integer;
    v_reason         text;
    v_has_diff       boolean := false;
    v_items_meta     jsonb   := '{}'::jsonb;
    v_receipt_meta   jsonb;
    v_next_status    text;
    v_notes_final    text;
    v_temp           text;
    v_dest_before    numeric(10,3);
    v_dest_after     numeric(10,3);
    v_origin_before2 numeric(10,3);
    v_origin_after2  numeric(10,3);
    v_audit_uid      uuid;
    v_audit_username text;
    v_row_ct         integer;
begin
    -- ===== SEGURIDAD: usar auth.uid() no p_user_id como fuente de verdad =====
    v_audit_uid := auth.uid();
    p_user_id   := coalesce(v_audit_uid, p_user_id);

    if v_audit_uid is not null then
        select coalesce(username, email, 'SISTEMA') into v_audit_username
        from public.users
        where id = v_audit_uid
        limit 1;
    end if;
    v_audit_username := coalesce(btrim(v_audit_username),
                                 btrim(p_username),
                                 'SISTEMA');

    select t.from_branch_id, t.to_branch_id, t.status, t.notes,
           fb.name as fb_name, tb.name as tb_name
    into v_transfer
    from public.inventory_transfers t
    left join public.branches fb on fb.id = t.from_branch_id
    left join public.branches tb on tb.id = t.to_branch_id
    where t.id = p_transfer_id;

    if not found then
        raise exception 'No se encontró la orden de traspaso.';
    end if;

    v_origin_br_id := v_transfer.from_branch_id;
    v_dest_br_id   := v_transfer.to_branch_id;
    v_status       := v_transfer.status;
    v_raw_notes    := coalesce(v_transfer.notes, '');
    v_origin_name  := coalesce(v_transfer.fb_name, 'SUCURSAL ORIGEN');
    v_dest_name    := coalesce(v_transfer.tb_name, 'SUCURSAL DESTINO');

    if p_destination_branch is null or v_dest_br_id <> p_destination_branch then
        raise exception 'Esta orden no corresponde a la sucursal activa.';
    end if;

    -- ===== SEGURIDAD CONTRA TOCTOU: UPDATE condicional + row_count =====
    update public.inventory_transfers
       set status       = 'pending_receipt',
           completed_at = v_database_ts
     where id     = p_transfer_id
       and status = 'pending_receipt';
    GET DIAGNOSTICS v_row_ct = ROW_COUNT;
    if v_row_ct = 0 then
        raise exception 'La orden ya fue recibida o cancelada (o no existe en estado pending_receipt).';
    end if;

    v_sep_idx := position(chr(10)||chr(10)||'##TRANSFER_META##' in v_raw_notes);
    if v_sep_idx > 0 then
        v_note_text := btrim(substring(v_raw_notes from 1 for v_sep_idx - 1));
        v_temp      := substring(v_raw_notes from v_sep_idx
                        + length(chr(10)||chr(10)||'##TRANSFER_META##'));
        begin
            v_meta := btrim(coalesce(v_temp,'{}'))::jsonb;
            if jsonb_typeof(v_meta) <> 'object' then v_meta := '{}'::jsonb; end if;
        exception when others then
            v_meta := '{}'::jsonb;
        end;
    else
        v_note_text := btrim(v_raw_notes);
        v_meta      := '{}'::jsonb;
    end if;

    v_folio := coalesce(v_meta ->> 'folio', 'TR-SIN-FOLIO');

    for v_item in
        select
            iti.id, iti.product_id, iti.quantity, iti.cost_price,
            coalesce(p.name, 'PRODUCTO SIN NOMBRE') as p_name
        from public.inventory_transfer_items iti
        left join public.products p on p.id = iti.product_id
        where iti.transfer_id = p_transfer_id
    loop
        v_product_id := v_item.product_id;
        v_req_qty    := coalesce(v_item.quantity, 0)::integer;
        v_cost_price := coalesce(v_item.cost_price, 0);
        v_item_name  := coalesce(v_item.p_name, 'PRODUCTO SIN NOMBRE');

        select coalesce(sale_price, 0) into v_sale_price
        from public.branch_inventory
        where branch_id = v_dest_br_id and product_id = v_product_id;
        v_sale_price := coalesce(v_sale_price, 0);

        -- ===== SNAPSHOT: stock destino ANTES, origen ANTES =====
        select coalesce(stock, 0) into v_dest_before
        from public.branch_inventory
        where branch_id = v_dest_br_id and product_id = v_product_id;
        v_dest_before := coalesce(v_dest_before, 0);

        select coalesce(stock, 0) into v_origin_before2
        from public.branch_inventory
        where branch_id = v_origin_br_id and product_id = v_product_id;
        v_origin_before2 := coalesce(v_origin_before2, 0);

        v_parsed_rq := null;
        begin
            v_parsed_rq := (p_received_qty_map ->> v_product_id::text)::numeric;
        exception when others then
            v_parsed_rq := null;
        end;
        if v_parsed_rq is null then
            v_parsed_rq := v_req_qty;
        end if;

        if v_parsed_rq < 0 or v_parsed_rq > v_req_qty then
            raise exception
                'La recepción de % debe estar entre 0 y % piezas.',
                v_item_name, v_req_qty::text;
        end if;

        v_received_qty := floor(v_parsed_rq)::integer;
        v_returned_qty := v_req_qty - v_received_qty;

        if v_received_qty > 0 then
            v_reason := 'TRASPASO RECIBIDO DE ' || v_folio || ' ' || v_origin_name;
            perform public._apply_inventory_delta(
                p_branch_id  => v_dest_br_id,
                p_product_id => v_product_id,
                p_delta      => v_received_qty::numeric,
                p_cost_price => v_cost_price,
                p_sale_price => v_sale_price,
                p_reason     => v_reason,
                p_user_id    => p_user_id,
                p_created_at => v_database_ts
            );
        end if;

        if v_returned_qty > 0 then
            v_has_diff := true;
            v_reason   := 'TRASPASO DEVOLUCION AUTOMATICA A '
                          || v_folio || ' ' || v_origin_name
                          || ' - Diferencia en recepcion hacia ' || v_dest_name;
            perform public._apply_inventory_delta(
                p_branch_id  => v_origin_br_id,
                p_product_id => v_product_id,
                p_delta      => v_returned_qty::numeric,
                p_cost_price => v_cost_price,
                p_sale_price => v_sale_price,
                p_reason     => v_reason,
                p_user_id    => p_user_id,
                p_created_at => v_database_ts
            );
        end if;

        -- ===== SNAPSHOT: stock DESPUES de ambos deltas =====
        select coalesce(stock, 0) into v_dest_after
        from public.branch_inventory
        where branch_id = v_dest_br_id and product_id = v_product_id;
        v_dest_after := coalesce(v_dest_after, 0);

        select coalesce(stock, 0) into v_origin_after2
        from public.branch_inventory
        where branch_id = v_origin_br_id and product_id = v_product_id;
        v_origin_after2 := coalesce(v_origin_after2, 0);

        -- ===== ESCRIBIR 6 SNAPSHOTS EN inventory_transfer_items =====
        update public.inventory_transfer_items
           set destination_stock_before = v_dest_before,
               destination_stock_after  = v_dest_after,
               origin_stock_before      = coalesce(origin_stock_before, v_origin_before2),
               origin_stock_after       = coalesce(origin_stock_after,  v_origin_after2),
               received_qty             = v_received_qty,
               returned_qty             = v_returned_qty
         where id = v_item.id;

        v_items_meta := v_items_meta || jsonb_build_object(
            v_product_id::text,
            jsonb_build_object(
                'receivedQty', v_received_qty,
                'returnedQty', v_returned_qty
            )
        );
    end loop;

    v_next_status  := case when v_has_diff then 'received_with_difference'
                          else 'received_complete' end;

    v_receipt_meta := coalesce(v_meta, '{}'::jsonb)
        || jsonb_build_object(
            'receivedAt',         to_char(v_database_ts, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'receivedByUserId',   p_user_id,
            'receivedByUsername', v_audit_username,
            'itemOutcomes',       v_items_meta
        );

    v_notes_final := public._build_transfer_notes(v_note_text, v_receipt_meta);

    update public.inventory_transfers
       set status       = v_next_status,
           completed_at = v_database_ts,
           notes        = v_notes_final
     where id = p_transfer_id;

    return jsonb_build_object(
        'success',    true,
        'transferId', p_transfer_id,
        'nextStatus', v_next_status,
        'folio',      v_folio
    );

exception when others then
    raise exception 'receive_transfer_order: % (SQLSTATE=%)', sqlerrm, sqlstate;
end;
$function$;
