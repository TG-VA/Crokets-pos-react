-- local_branch_names de get_branch_products_paginated busca en branch_inventory solo por
-- product_id. El unico indice util existente es (branch_id, product_id), que no sirve cuando
-- product_id no es la primera columna.

create index if not exists idx_branch_inventory_product
  on public.branch_inventory (product_id);
