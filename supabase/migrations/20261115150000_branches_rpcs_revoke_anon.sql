-- create_branch y set_branch_active tenian EXECUTE para anon por los privilegios por defecto
-- (la migracion 20261020120000 solo revoca PUBLIC). Sin sesion, auth.uid() es NULL y la RPC toma
-- p_admin_id: cualquiera con el UUID de un admin podia crear o desactivar sucursales sin login.
-- La app siempre llama con sesion (authenticated), asi que revocar anon no cambia su flujo.
-- set_branch_active en remoto tampoco tiene coalesce(auth.uid(), p_admin_id) (ver KNOWN_ISSUES).
-- Rollback:
--   grant execute on function public.create_branch(text, text, uuid, text, text, text, text, text, text, text) to anon;
--   grant execute on function public.set_branch_active(uuid, boolean, uuid) to anon;

revoke execute on function public.create_branch(text, text, uuid, text, text, text, text, text, text, text) from anon;
revoke execute on function public.set_branch_active(uuid, boolean, uuid) from anon;
