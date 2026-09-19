# SUPABASE_MIGRATIONS.md — Migraciones y edge functions

Guía del flujo de cambios de schema y funciones en el proyecto Supabase remoto.

## Fuente de verdad

- **`supabase/migrations/` es la fuente de verdad** para cambios de schema y RPCs nuevos. Cada
  cambio se agrega como un archivo `.sql` versionado y se aplica al proyecto remoto con la CLI.
- Los archivos `supabase/legacy/supabase_migration.sql` y
  `supabase/legacy/supabase_migration_kits_limit.sql` son **legacy/ad-hoc** (previos a la adopción de
  migraciones versionadas). No usarlos para cambios nuevos ni tomarlos como referencia del estado
  actual.
- `supabase/scripts/schema_introspection.sql` es un script de **solo lectura** para regenerar el
  inventario de schema (`SCHEMA.md`) por introspección; no es una migración ni se aplica con `db push`.

Migraciones existentes (al 17 sep 2026):

| Migración | Contenido |
|---|---|
| `00000000000000_remote_schema_baseline.sql` | Baseline completo del schema `public` (`pg_dump` schema-only: 50 tablas, 30 funciones, 31 políticas RLS). Version más antigua a propósito: en un entorno nuevo corre primero y crea las tablas base. En el remoto existente está marcado como aplicado con `migration repair` (ver abajo) |
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
| `20260915120000_deactivate_test_user.sql` | Desactiva el usuario de prueba `alexander@example.com` de forma idempotente (#14) |
| `20260917180000_get_email_by_username.sql` | Versiona la RPC `get_email_by_username` (login pre-auth): `SECURITY DEFINER`, `STABLE`, `search_path=public`, grants a `anon`/`authenticated`/`service_role` (#41) |
| `20260917190000_cash_register_branch_validation.sql` | Validación de membresía de sucursal en `get_cash_register_session` y `open_cash_register` (helper `_user_can_access_branch`, excepción `42501` si no pertenece; exento `is_admin()`) (#29) |
| `20260917200000_harden_transactional_rpcs.sql` | Revoca `EXECUTE` a `anon`/`PUBLIC` en las RPCs transaccionales y fija `p_user_id := coalesce(auth.uid(), p_user_id)` para impedir suplantación entre usuarios autenticados (#10/#13/#38) |

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
- Revocar `EXECUTE ... FROM anon` **y** `... FROM public` en RPCs nuevos; la app siempre llama con
  sesión (`authenticated`). Revocar solo de `anon` deja el grant implícito de `PUBLIC` (`=X/postgres`),
  que concede ejecución a cualquier rol.
- **RPCs transaccionales (17 sep 2026):** `create_sale_transaction` (3 sobrecargas),
  `cancel_sale_transaction`, `create_partial_return_transaction`, `create_transfer_order`,
  `cancel_transfer_order`, `receive_transfer_order`, `cancel_sale` y `complete_sale` exigen
  `authenticated` (sin `anon`/`PUBLIC`) y derivan el actor de `auth.uid()`; solo se conserva el
  `p_user_id` entrante cuando no hay sesión (`service_role`/jobs internos). Defensa en profundidad:
  `is_admin()` resuelve `users.id = auth.uid()`, por lo que el uid coincide con `public.users.id`.
  El RLS se mantiene sin cambios (modelo `authenticated` de confianza) — ver `KNOWN_ISSUES.md`
  #10/#13/#38.
- **Excepciones documentadas (17 sep 2026):**
  - `get_branch_by_device` es `SECURITY DEFINER` y se concede a `anon` porque el login lo invoca
    **antes** de tener sesión (login pre-auth por `device_code`); rompe RLS a propósito. Devuelve
    solo `id/name/code` de la sucursal activa y se apoya en que `device_code` es un UUID generado con
    `crypto.randomUUID()` (`electron/main.js`), por lo que no es enumerable. Mitigación futura: mover
    la resolución a una edge function con rate limiting o a un intercambio one-time cuando el volumen
    de POS crezca. Ver `KNOWN_ISSUES.md` #30 y `PERMISSIONS.md`.
  - `get_cash_register_session` y `open_cash_register` son `SECURITY DEFINER` porque deben leer la
    sesión de caja abierta de **cualquier** usuario de la sucursal (el RLS por fila lo impediría);
    exigen `authenticated` y, desde `20260917190000`, validan que el usuario autenticado tenga
    membresía activa en `user_branches` para esa sucursal o sea `is_admin()`. No devuelven más que la
    sesión de caja. Ver `KNOWN_ISSUES.md` #29.

## Edge functions

La configuración vive en `supabase/config.toml`. Deploy:

```bash
supabase functions deploy authorize-admin-action
```

Ver `docs/EDGE_FUNCTIONS.md` para el contrato de las funciones.

## Baseline y entornos nuevos

El schema base quedó capturado en `00000000000000_remote_schema_baseline.sql`. Reglas:

- **Proyecto remoto ya existente (el actual):** la migración ya está marcada como aplicada y no debe
  volver a ejecutarse. Si se vincula un clon del repo al mismo proyecto, verificar con
  `supabase migration list` que la versión `00000000000000` aparece en ambos lados.
- **Entorno nuevo (proyecto Supabase vacío):** `supabase db push` aplica el baseline primero (crea las
  tablas) y luego el resto de las migraciones. No requiere pasos extra.
- Si por error la versión del baseline no figura en el remoto, marcarla sin re-ejecutar el DDL:
  ```bash
  supabase migration repair --status applied 00000000000000
  ```
- El baseline se generó con `supabase db dump --linked --schema public` y se edita **solo** con
  migraciones nuevas encima (nunca a mano).

## Pendiente

- **Regenerar `SCHEMA.md`** usando `supabase/scripts/schema_introspection.sql` cuando cambie el
  schema; el inventario actual es del 24 ago 2026 y no incorpora aún las últimas migraciones.
