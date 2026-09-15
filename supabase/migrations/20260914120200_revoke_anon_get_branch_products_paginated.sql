-- Hardening de grants: el RPC base de paginación de productos concedía EXECUTE a anon.
-- Con RLS USING(true) en varias tablas de datos (KNOWN_ISSUES #13), un llamador sin
-- sesión podía invocar el catálogo de la sucursal con la anon key pública.
-- El frontend solo lo llama con sesión (useProductsList), por lo que revocar anon no
-- afecta el flujo actual. Cierra el follow-up pendiente del punto #26.
revoke execute on function public.get_branch_products_paginated(uuid, text, uuid, integer, integer) from anon;
