# SUPABASE_MIGRATIONS.md — Migraciones y edge functions

Guía del flujo de cambios de schema y funciones en el proyecto Supabase remoto.

## Fuente de verdad

- **`supabase/migrations/` es la fuente de verdad** para cambios de schema y RPCs nuevos. Cada
  cambio se agrega como un archivo `.sql` versionado y se aplica al proyecto remoto con la CLI.
- Los archivos `supabase_migration.sql` y `supabase_migration_kits_limit.sql` de la **raíz del repo
  son legacy/ad-hoc** (previos a la adopción de migraciones versionadas). No usarlos para cambios
  nuevos ni tomarlos como referencia del estado actual.

Migraciones existentes (al 14 sep 2026):

| Migración | Contenido |
|---|---|
| `20260909123000_get_branch_products_paginated.sql` | RPC de paginación server-side de productos |
| `20260910120000_performance_indexes.sql` | Índices de performance para reportes |
| `20260910120100_get_cash_report_sessions.sql` | RPC de reporte de caja |
| `20260910120200_get_commissions_report_data.sql` | RPC de comisiones |
| `20260910120300_get_inventory_report_data.sql` | RPC de inventario |
| `20260910120400_commissions_rpc_unlimited_default.sql` | Corrección de default de `p_page_size` |
| `20260910120500_fix_commissions_status_filter.sql` | Exclusión de ventas canceladas en comisiones |
| `20260910120600_restrict_report_rpc_grants.sql` | Revoca `EXECUTE` a `anon` en RPCs de reportes |
| `20260914120000_get_branch_by_device.sql` | RPC anon `get_branch_by_device` (traduce `device_code` a sucursal en login pre-auth) |
| `20260914120100_cash_register_rpcs.sql` | RPCs `get_cash_register_session` y `open_cash_register` + helper `_cash_session_payload` |
| `20260914120200_revoke_anon_get_branch_products_paginated.sql` | Revoca `EXECUTE` a `anon` del RPC base de paginación de productos |
| `20260914130000_cash_register_hardening.sql` | Tabla `app_settings` (tope de apertura configurable), tope en `open_cash_register` (`CASH_INVALID_AMOUNT`), payload con columnas explícitas, helper `_cash_already_open_response` e índice único parcial de caja abierta por sucursal (#32) |

## Convención de nombres

```
YYYYMMDDHHMMSS_descripcion_corta.sql
```

El timestamp lo genera la CLI con `supabase migration new`. Los ítems nuevos se numeran
consecutivamente; **no renumerar migraciones ya aplicadas** (ver `KNOWN_ISSUES.md` #23).

## Flujo de trabajo

```bash
# 1. Vincular el repo con el proyecto remoto (una vez)
supabase link --project-ref <project-ref>

# 2. Crear una migración nueva
supabase migration new descripcion_corta
# editar el .sql generado en supabase/migrations/

# 3. Revisar el estado local vs remoto
supabase migration list

# 4. Aplicar al remoto
supabase db push
```

- Las migraciones **ya aplicadas al remoto no se pueden aplastar** sin resetear proyectos externos;
  las correcciones se hacen con una migración nueva (`CREATE OR REPLACE`, `ALTER`, etc.).
- Preferir cambios idempotentes y RPCs `LANGUAGE sql` invoker (sin `SECURITY DEFINER`) para que RLS
  siga aplicando al llamador.
- Revocar `EXECUTE ... FROM anon` en RPCs nuevos; la app siempre llama con sesión (`authenticated`).
- **Excepciones documentadas (14 sep 2026):**
  - `get_branch_by_device` es `SECURITY DEFINER` y se concede a `anon` porque el login lo invoca
    **antes** de tener sesión. Devuelve solo `id/name/code` de la sucursal y se apoya en que
    `device_code` es un UUID no enumerable. Ver `KNOWN_ISSUES.md` #30.
  - `get_cash_register_session` y `open_cash_register` son `SECURITY DEFINER` porque deben leer la
    sesión de caja abierta de **cualquier** usuario de la sucursal (el RLS por fila lo impediría);
    exigen `authenticated` y no devuelven más que la sesión de caja. Ver `KNOWN_ISSUES.md` #29.

## Edge functions

La configuración vive en `supabase/config.toml`. Deploy:

```bash
supabase functions deploy authorize-admin-action
```

Ver `docs/EDGE_FUNCTIONS.md` para el contrato de las funciones.

## Pendiente

- **Baseline completo del schema** (`supabase db dump` a una migración inicial): hoy las migraciones
  cubren solo los RPCs de reportes, no las tablas base. Ver `KNOWN_ISSUES.md` #6 y `SCHEMA.md`.
