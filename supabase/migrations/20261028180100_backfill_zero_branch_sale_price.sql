-- Corrige filas de branch_inventory con sale_price = 0 mientras el catalogo tiene precio.
-- sale_price es NOT NULL, por lo que se copia el precio vigente del catalogo.
-- Idempotente: una segunda ejecucion no encuentra filas que actualizar.
update public.branch_inventory bi
set sale_price = p.sale_price
from public.products p
where p.id = bi.product_id
  and bi.sale_price = 0
  and p.sale_price > 0;
