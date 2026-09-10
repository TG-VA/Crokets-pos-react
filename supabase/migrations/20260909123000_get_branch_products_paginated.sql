-- Paginación server-side para la lista de productos de una sucursal.
--
-- Replica exactamente el conjunto expuesto por fetchBranchCatalog:
--   A) productos con inventario en la sucursal (siempre que estén activos)
--   B) productos globales activos SIN inventario en esa sucursal
-- ordenado igual que el cliente previo: primero los que controlan inventario
-- (tracks_inventory) y luego alfabético por descripción.
--
-- Uso (PostgREST/supabase-js):
--   supabase.rpc("get_branch_products_paginated", {
--     p_branch_id, p_search, p_department_id, p_page, p_page_size
--   })
--
-- total_count viene en cada fila (COUNT(*) OVER) para alimentar la paginación
-- sin consultas adicionales.

create or replace function public.get_branch_products_paginated(
  p_branch_id uuid,
  p_search text default null,
  p_department_id uuid default null,
  p_page integer default 1,
  p_page_size integer default 10
)
returns table (
  product_id uuid,
  inventory_id uuid,
  codigo text,
  descripcion text,
  departamento text,
  costo numeric,
  precio numeric,
  existencias numeric,
  minimo numeric,
  maximo numeric,
  is_active boolean,
  has_been_stocked boolean,
  tracks_inventory boolean,
  total_count bigint
)
language plpgsql
stable
as $$
declare
  v_limit integer;
  v_offset integer;
begin
  v_limit := greatest(1, coalesce(p_page_size, 10));
  v_offset := (greatest(1, coalesce(p_page, 1)) - 1) * v_limit;

  return query
  with combined as (
    select
      p.id as product_id,
      bi.id as inventory_id,
      nullif(p.barcode, '')::text as codigo,
      upper(coalesce(p.name, ''))::text as descripcion,
      coalesce(d.name, 'Sin departamento')::text as departamento,
      coalesce(bi.cost_price, p.cost_price, 0)::numeric as costo,
      coalesce(bi.sale_price, p.sale_price, 0)::numeric as precio,
      coalesce(bi.stock, 0)::numeric as existencias,
      coalesce(bi.min_stock, 0)::numeric as minimo,
      coalesce(bi.max_stock, 0)::numeric as maximo,
      coalesce(bi.is_active, false) as is_active,
      coalesce(bi.has_been_stocked, false) as has_been_stocked,
      coalesce(p.tracks_inventory, false) as tracks_inventory
    from public.products p
    left join public.branch_inventory bi
      on bi.product_id = p.id
     and bi.branch_id = p_branch_id
    left join public.departments d
      on d.id = p.department_id
    where p.status = true
      and (bi.id is not null or p.is_global = true)
      and (
        p_search is null
        or p_search = ''
        or p.name ilike '%' || p_search || '%'
        or p.barcode ilike '%' || p_search || '%'
      )
      and (p_department_id is null or p.department_id = p_department_id)
  )
  select
    c.product_id,
    c.inventory_id,
    c.codigo,
    c.descripcion,
    c.departamento,
    c.costo,
    c.precio,
    c.existencias,
    c.minimo,
    c.maximo,
    c.is_active,
    c.has_been_stocked,
    c.tracks_inventory,
    count(*) over () as total_count
  from combined c
  order by c.tracks_inventory desc, c.descripcion asc, c.product_id asc
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.get_branch_products_paginated(uuid, text, uuid, integer, integer) from public;
grant execute on function public.get_branch_products_paginated(uuid, text, uuid, integer, integer) to anon, authenticated;
