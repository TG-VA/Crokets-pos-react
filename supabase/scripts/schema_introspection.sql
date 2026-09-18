-- schema_introspection.sql
--
-- Inventario del schema `public` por introspección directa. Reproduce lo que hasta ahora se
-- generaba de forma ad-hoc (ver SCHEMA.md) y que no estaba versionado (KNOWN_ISSUES #6 y #41).
--
-- Uso:
--   psql "$DB_URL" -f supabase/scripts/schema_introspection.sql
--   o ejecutar cada sentencia vía la Management API:
--   POST https://api.supabase.com/v1/projects/<project-ref>/database/query
--
-- Solo lectura: no modifica el esquema.

-- 1. Tablas y columnas
select
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
from information_schema.columns c
join information_schema.tables t
  on t.table_schema = c.table_schema and t.table_name = c.table_name
where c.table_schema = 'public'
  and t.table_type = 'BASE TABLE'
order by c.table_name, c.ordinal_position;

-- 2. Llaves primarias, foráneas y restricciones de tabla
select
  tc.table_name,
  tc.constraint_type,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
where tc.table_schema = 'public'
order by tc.table_name, tc.constraint_type, tc.constraint_name, kcu.ordinal_position;

-- 3. Índices (definición completa)
select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 4. Funciones / RPC (definición completa, seguridad y ACL)
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as identity_args,
  p.prosecdef as security_definer,
  p.provolatile,
  pg_get_functiondef(p.oid) as definition,
  array_to_string(p.proacl, E '\n') as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname, identity_args;

-- 5. Triggers
select
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and not t.tgisinternal
order by c.relname, t.tgname;

-- 6. RLS activo por tabla
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- 7. Políticas RLS
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
