-- Reporte de inventario por sucursal en una sola llamada y sin tope de filas (S1 del PR #226,
-- KNOWN_ISSUES #97). Antes el cliente leia branch_inventory y products por paginas de 1000 hasta
-- 10000 filas. Devuelve un solo jsonb para que db-max-rows de PostgREST no corte el resultado.
--
-- Cada elemento trae row_kind:
--   inventory         fila activa de branch_inventory de la sucursal (producto activo)
--   no_branch_record  producto activo con tracks_inventory = true sin fila activa (D2)
--   no_stock          producto activo con tracks_inventory = false sin fila activa
-- Un producto con tracks_inventory null y sin fila no aparece, igual que la version paginada.
-- security invoker (por defecto): aplica la RLS del llamador.

create or replace function public.get_branch_inventory_report(p_branch_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'row_kind', r.row_kind,
        'inventory_row_id', r.inventory_row_id,
        'product_id', r.product_id,
        'barcode', r.barcode,
        'name', r.name,
        'department_id', r.department_id,
        'department_name', r.department_name,
        'tracks_inventory', r.tracks_inventory,
        'stock', r.stock,
        'min_stock', r.min_stock,
        'max_stock', r.max_stock
      )
      order by r.product_id, r.inventory_row_id
    ),
    '[]'::jsonb
  )
  from (
    select
      case
        when bi.id is not null then 'inventory'
        when p.tracks_inventory is true then 'no_branch_record'
        else 'no_stock'
      end as row_kind,
      bi.id as inventory_row_id,
      p.id as product_id,
      p.barcode,
      p.name,
      p.department_id,
      d.name as department_name,
      p.tracks_inventory,
      bi.stock,
      bi.min_stock,
      bi.max_stock
    from public.products p
    left join public.branch_inventory bi
      on bi.product_id = p.id
     and bi.branch_id = p_branch_id
     and bi.is_active = true
    left join public.departments d
      on d.id = p.department_id
    where p_branch_id is not null
      and p.status = true
      and (bi.id is not null or p.tracks_inventory is not null)
  ) r;
$$;

revoke execute on function public.get_branch_inventory_report(uuid) from public;
revoke execute on function public.get_branch_inventory_report(uuid) from anon;
grant execute on function public.get_branch_inventory_report(uuid) to authenticated;
