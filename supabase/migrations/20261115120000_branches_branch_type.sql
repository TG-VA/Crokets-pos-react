-- branches.branch_type: distingue sucursales operativas (venden, cobran, tienen stock) de las
-- administrativas (solo reportes, pedidos, traspasos y alta de productos; sin stock propio).
-- Aditiva: el default 'operational' mantiene el comportamiento de clientes anteriores.
-- ADM-BREN no tiene inventario, movimientos ni ventas al momento de marcarla como admin.
-- Idempotente: add column if not exists y constraint creado solo si falta.
-- Rollback:
--   alter table public.branches drop constraint if exists branches_branch_type_check;
--   alter table public.branches drop column if exists branch_type;

alter table public.branches
  add column if not exists branch_type text not null default 'operational';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'branches_branch_type_check'
      and conrelid = 'public.branches'::regclass
  ) then
    alter table public.branches
      add constraint branches_branch_type_check
      check (branch_type in ('operational', 'admin'));
  end if;
end;
$$;

update public.branches
set branch_type = 'admin'
where code = 'ADM-BREN';
