-- import_products_transaction: retirar EXECUTE a service_role.
-- El guard `if not public.is_admin()` usa auth.uid(), que es NULL con la
-- service role key, asi que el grant no habilitaba ninguna llamada.
-- Rollback: GRANT EXECUTE ... TO service_role;
REVOKE ALL ON FUNCTION public.import_products_transaction(p_rows jsonb, p_branch_id uuid, p_all_branches jsonb) FROM service_role;
