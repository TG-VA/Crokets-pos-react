-- El listado de productos por sucursal ahora expone el alcance del producto: is_global
-- indica si es de catalogo global y local_branch_names lista las sucursales que lo
-- tienen cuando es local. Una fila de branch_inventory con is_active = false cuenta como
-- sucursal que NO tiene el producto.
-- Cambian las columnas de retorno, por lo que se hace DROP + CREATE y se reaplican los
-- grants (anon revocado en 20260914120200).

drop function if exists public.get_branch_products_paginated(uuid, text, uuid, integer, integer);

create function public.get_branch_products_paginated(
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
  is_global boolean,
  local_branch_names text[],
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
      coalesce(nullif(bi.sale_price, 0), p.sale_price, 0)::numeric as precio,
      coalesce(bi.stock, 0)::numeric as existencias,
      coalesce(bi.min_stock, 0)::numeric as minimo,
      coalesce(bi.max_stock, 0)::numeric as maximo,
      coalesce(bi.is_active, false) as is_active,
      coalesce(bi.has_been_stocked, false) as has_been_stocked,
      coalesce(p.tracks_inventory, false) as tracks_inventory,
      coalesce(p.is_global, false) as is_global
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
  ),
  page_rows as (
    select
      c.*,
      count(*) over () as total_count
    from combined c
    order by c.tracks_inventory desc, c.descripcion asc, c.product_id asc
    limit v_limit
    offset v_offset
  )
  select
    r.product_id,
    r.inventory_id,
    r.codigo,
    r.descripcion,
    r.departamento,
    r.costo,
    r.precio,
    r.existencias,
    r.minimo,
    r.maximo,
    r.is_active,
    r.has_been_stocked,
    r.tracks_inventory,
    r.is_global,
    case
      when r.is_global then '{}'::text[]
      else coalesce(
        (
          select array_agg(b.name::text order by b.name)
          from public.branch_inventory bi2
          join public.branches b
            on b.id = bi2.branch_id
          where bi2.product_id = r.product_id
            and bi2.is_active = true
        ),
        '{}'::text[]
      )
    end as local_branch_names,
    r.total_count
  from page_rows r
  order by r.tracks_inventory desc, r.descripcion asc, r.product_id asc;
end;
$$;

revoke execute on function public.get_branch_products_paginated(uuid, text, uuid, integer, integer) from public;
revoke execute on function public.get_branch_products_paginated(uuid, text, uuid, integer, integer) from anon;
grant execute on function public.get_branch_products_paginated(uuid, text, uuid, integer, integer) to authenticated;
grant execute on function public.get_branch_products_paginated(uuid, text, uuid, integer, integer) to service_role;
