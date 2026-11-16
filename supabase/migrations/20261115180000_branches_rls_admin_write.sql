-- public.branches tenia RLS desactivado y anon/authenticated con INSERT, UPDATE y DELETE:
-- con la clave anon del instalador cualquiera podia crear, editar o borrar sucursales sin login.
-- Esta migracion:
--   1. Activa RLS. La politica branches_select_authenticated_all ya existe y se conserva.
--   2. Agrega lectura para anon: Login.jsx lee branches antes de signInWithPassword; sin esta
--      politica el login dejaria de resolver la sucursal.
--   3. Revoca toda escritura a anon y INSERT/DELETE/TRUNCATE a authenticated. Crear y desactivar
--      sucursales va por las RPC SECURITY DEFINER create_branch y set_branch_active.
--   4. Solo un admin (public.is_admin()) puede hacer UPDATE desde el cliente.
--   5. Rechaza cambiar branch_type en un UPDATE (KNOWN_ISSUES #87): el tipo solo se fija al crear.
-- Rollback:
--   drop trigger if exists branches_branch_type_immutable on public.branches;
--   drop function if exists public.reject_branch_type_change();
--   drop policy if exists branches_update_admin on public.branches;
--   drop policy if exists branches_select_anon on public.branches;
--   grant insert, update, delete, truncate on table public.branches to anon, authenticated;
--   alter table public.branches disable row level security;

alter table public.branches enable row level security;

create policy branches_select_anon
  on public.branches
  for select
  to anon
  using (true);

revoke insert, update, delete, truncate on table public.branches from anon;
revoke insert, delete, truncate on table public.branches from authenticated;

create policy branches_update_admin
  on public.branches
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.reject_branch_type_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.branch_type is distinct from old.branch_type then
    raise exception 'El tipo de sucursal no es editable: solo se elige al crearla.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function public.reject_branch_type_change() from public, anon, authenticated;

create trigger branches_branch_type_immutable
  before update of branch_type on public.branches
  for each row
  execute function public.reject_branch_type_change();
