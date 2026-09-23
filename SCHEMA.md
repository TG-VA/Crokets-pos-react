### SCHEMA.md — Inventario de datos (SQLite local + Supabase remoto)

Este documento es un **inventario de tablas y columnas** del schema `public` de Supabase, generado
por introspección directa (`information_schema`), origen el 24 de agosto de 2026 y regenerado el
23 de septiembre de 2026. No sustituye el detalle completo del Dashboard de Supabase, pero permite
entender la estructura del proyecto sin salir del repositorio. Si el schema cambia, este documento
debe regenerarse ejecutando el script versionado `supabase/scripts/schema_introspection.sql`
(solo lectura) y actualizando las tablas de abajo.

**Actualización (17 sep 2026) — rama `chore/tech-debt-foundations`:** el schema completo quedó
versionado como baseline ejecutable en
`supabase/migrations/00000000000000_remote_schema_baseline.sql` (`pg_dump` schema-only: 50 tablas,
30 funciones, 31 políticas RLS — hoy el remoto tiene 37 funciones, ver inventario RPC abajo),
marcado como aplicado en el remoto con `supabase migration repair`. El script de introspección que
antes se corría ad-hoc ya está versionado en `supabase/scripts/schema_introspection.sql`. Con esto
este documento deja de ser la única referencia de schema en Git (ver `KNOWN_ISSUES.md` #6 y
`docs/SUPABASE_MIGRATIONS.md`). `get_email_by_username`, que se documenta más abajo en la tabla de
RPCs, también quedó capturada en una migración (`20260917180000`, ver `KNOWN_ISSUES.md` #41).

**Actualización (23 sep 2026) — rama `chore/deploy-supabase-migrations-and-sync-schema`:** las
tablas de abajo fueron regeneradas desde el remoto vía `supabase/scripts/schema_introspection.sql`.
Coinciden con `supabase/migrations/00000000000000_remote_schema_baseline.sql` más las migraciones
posteriores desplegadas (`app_settings`, RPCs de caja/login, kits de productos, devoluciones
parciales, importación masiva, `sale_details` con snapshot de comisiones). Se incorporan al
inventario las tablas `sale_kit_items`, `sale_return_items`, `sale_returns`, `system_settings` y
`user_sessions`, y se actualiza la lista de RPC con las funciones atómicas de kits e importación
(definidas en `20260923150000`/`20260923160000`, ver `KNOWN_ISSUES.md` #5).

**Convención:** `NN` = NOT NULL. FK se indica como `→ tabla.columna`.

---

## Ventas y Caja

### sales

| Columna           | Tipo        | Notas                                                                                                                                                                                                                                                |
| ----------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                | uuid        | PK                                                                                                                                                                                                                                                   |
| user_id           | uuid        | NN, → users.id                                                                                                                                                                                                                                       |
| customer_id       | uuid        | → customers.id                                                                                                                                                                                                                                       |
| branch_id         | uuid        | NN, → branches.id                                                                                                                                                                                                                                    |
| sale_date         | timestamptz | default now()                                                                                                                                                                                                                                        |
| subtotal          | numeric     | NN                                                                                                                                                                                                                                                   |
| tax               | numeric     | default 16.00                                                                                                                                                                                                                                        |
| total             | numeric     | NN                                                                                                                                                                                                                                                   |
| status            | varchar     | default 'completed' — valores vigentes en la app: `completed`, `pending`, `refunded`, `cancelled`/`cancelada`, `partial_refund` (ver `ticketBuilder.js`, `reportsDashboardUtils.js`, `cashCut.jsx`, `salesHistoryService.js`, `salesCashService.js`) |
| client_sale_token | uuid        | idempotencia del cliente (POS)                                                                                                                                                                                                                       |
| discount_total    | numeric     | default 0                                                                                                                                                                                                                                            |
| notes             | text        |                                                                                                                                                                                                                                                      |

### sale_details

| Columna                                                                     | Tipo                                  | Notas                                    |
| --------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------- |
| id                                                                          | uuid                                  | PK                                       |
| sale_id                                                                     | uuid                                  | NN, → sales.id                           |
| product_id                                                                  | uuid                                  | NN, → products.id                        |
| branch_id                                                                   | uuid                                  | NN, → branches.id                        |
| quantity                                                                    | integer                               | NN                                       |
| unit_price / final_unit_price / original_unit_price                         | numeric                               | precio aplicado vs. original             |
| total_price                                                                 | numeric                               | NN                                       |
| discount_type / discount_value / discount_amount                            | varchar / numeric / numeric           | descuento por línea                      |
| commission_enabled / commission_type / commission_value / commission_amount | boolean / varchar / numeric / numeric | snapshot de comisión devengada por línea |

### sale_payments

| Columna           | Tipo    | Notas                      |
| ----------------- | ------- | -------------------------- |
| id                | uuid    | PK                         |
| sale_id           | uuid    | NN, → sales.id             |
| payment_method_id | uuid    | NN, → payment_methods.id   |
| branch_id         | uuid    | NN, → branches.id          |
| amount            | numeric | NN                         |
| currency          | varchar | default 'MXN'              |
| exchange_rate     | numeric | default 1                  |
| reference         | text    | folio/autorización externa |

### sale_reward_redemptions

| Columna                                     | Tipo                      | Notas                      |
| ------------------------------------------- | ------------------------- | -------------------------- |
| id                                          | uuid                      | PK                         |
| sale_id                                     | uuid                      | NN, → sales.id             |
| sale_detail_id                              | uuid                      | → sale_details.id          |
| customer_id                                 | uuid                      | NN, → customers.id         |
| reward_id                                   | uuid                      | NN, → rewards.id           |
| product_id                                  | uuid                      | → products.id              |
| branch_id                                   | uuid                      | NN, → branches.id          |
| user_id                                     | uuid                      | NN, → users.id             |
| quantity                                    | numeric                   | default 1                  |
| points_per_unit / total_points              | integer                   | NN                         |
| unit_price / discount_amount                | numeric                   | default 0                  |
| reward_name / product_name                  | text                      | copia histórica del nombre |
| status                                      | text                      | default 'applied'          |
| reversed_at / reversed_by / reversal_reason | timestamptz / uuid / text | soporte de reversión       |

### canceled_sales

| Columna          | Tipo        | Notas                |
| ---------------- | ----------- | -------------------- |
| id               | uuid        | PK                   |
| sale_id          | uuid        | NN, → sales.id       |
| user_id          | uuid        | NN, → users.id       |
| branch_id        | uuid        | NN, → branches.id    |
| cancel_reason    | text        | NN                   |
| refund_amount    | numeric     |                      |
| refund_method_id | uuid        | → payment_methods.id |
| canceled_at      | timestamptz |                      |

### sale_returns

| Columna            | Tipo        | Notas                  |
| ------------------ | ----------- | ---------------------- |
| id                 | uuid        | PK, default gen_random_uuid() |
| sale_id            | uuid        | NN, → sales.id         |
| user_id            | uuid        | NN, → users.id         |
| branch_id          | uuid        | NN, → branches.id      |
| return_reason      | text        | NN                     |
| refund_method_id   | uuid        | NN, → payment_methods.id |
| total_refund       | numeric(10,2) | NN, default 0          |
| created_at         | timestamp   | default now() (without time zone) |

### sale_return_items

| Columna           | Tipo        | Notas                    |
| ----------------- | ----------- | ------------------------ |
| id                | uuid        | PK, default gen_random_uuid() |
| return_id         | uuid        | NN, → sale_returns.id    |
| sale_detail_id    | uuid        | NN, → sale_details.id    |
| product_id        | uuid        | NN, → products.id        |
| quantity          | numeric     | NN                       |
| unit_price        | numeric     | NN                       |
| total_price       | numeric     | NN                       |
| created_at        | timestamptz | default now()            |

### cash_register_sessions

| Columna               | Tipo        | Notas             |
| --------------------- | ----------- | ----------------- |
| id                    | uuid        | PK                |
| user_id               | uuid        | NN, → users.id    |
| branch_id             | uuid        | NN, → branches.id |
| opening_amount        | numeric     | NN                |
| closing_amount        | numeric     |                   |
| opened_at / closed_at | timestamptz |                   |
| status                | varchar     | default 'open'    |
| difference            | numeric     | default 0         |

### cash_movements

| Columna       | Tipo    | Notas                                          |
| ------------- | ------- | ---------------------------------------------- |
| id            | uuid    | PK                                             |
| session_id    | uuid    | NN, → cash_register_sessions.id                |
| user_id       | uuid    | NN, → users.id                                 |
| branch_id     | uuid    | NN, → branches.id                              |
| movement_type | varchar | NN (entrada/salida de efectivo fuera de venta) |
| amount        | numeric | NN                                             |
| description   | text    |                                                |

### cash_cuts

| Columna                                       | Tipo    | Notas                       |
| --------------------------------------------- | ------- | --------------------------- |
| id                                            | uuid    | PK                          |
| branch_id                                     | uuid    | NN, → branches.id           |
| user_id                                       | uuid    | NN, → users.id              |
| cash_register_session_id                      | uuid    | → cash_register_sessions.id |
| cut_type                                      | varchar | NN                          |
| expected_amount / counted_amount / difference | numeric | NN                          |
| cut_date                                      | date    | NN                          |
| notes                                         | text    |                             |

### cash_cut_details

| Columna                                       | Tipo    | Notas                           |
| --------------------------------------------- | ------- | ------------------------------- |
| id                                            | uuid    | PK                              |
| cash_cut_id                                   | uuid    | NN, → cash_cuts.id              |
| payment_method_id                             | uuid    | NN, → payment_methods.id        |
| expected_amount / counted_amount / difference | numeric | NN, desglose por método de pago |

### pos_devices

| Columna     | Tipo    | Notas             |
| ----------- | ------- | ----------------- |
| id          | uuid    | PK                |
| device_code | text    | NN                |
| branch_id   | uuid    | NN, → branches.id |
| is_active   | boolean | default true      |

---

## Inventario

### branch_inventory

| Columna                 | Tipo    | Notas                    |
| ----------------------- | ------- | ------------------------ |
| id                      | uuid    | PK                       |
| branch_id               | uuid    | NN, → branches.id        |
| product_id              | uuid    | NN, → products.id        |
| stock                   | numeric | NN, default 0            |
| min_stock / max_stock   | numeric | umbrales de alerta       |
| cost_price / sale_price | numeric | NN — precio por sucursal |
| is_active               | boolean | default true             |
| has_been_stocked        | boolean | NN, default false        |

### inventory_movements

| Columna                               | Tipo    | Notas                          |
| ------------------------------------- | ------- | ------------------------------ |
| id                                    | uuid    | PK                             |
| product_id                            | uuid    | NN, → products.id              |
| branch_id                             | uuid    | NN, → branches.id              |
| related_branch_id                     | uuid    | → branches.id (transferencias) |
| movement_type                         | varchar | NN                             |
| quantity / previous_stock / new_stock | integer | NN                             |
| sale_id                               | uuid    | → sales.id                     |
| user_id                               | uuid    | → users.id                     |
| reason                                | text    |                                |

### inventory_adjustments

| Columna                                 | Tipo    | Notas             |
| --------------------------------------- | ------- | ----------------- |
| id                                      | uuid    | PK                |
| branch_id                               | uuid    | NN, → branches.id |
| product_id                              | uuid    | NN, → products.id |
| user_id                                 | uuid    | NN, → users.id    |
| previous_stock / new_stock / difference | numeric | NN                |
| reason                                  | varchar | NN                |
| notes                                   | text    |                   |

### inventory_transfers

| Columna                       | Tipo        | Notas             |
| ----------------------------- | ----------- | ----------------- |
| id                            | uuid        | PK                |
| from_branch_id / to_branch_id | uuid        | NN, → branches.id |
| user_id                       | uuid        | NN, → users.id    |
| status                        | varchar     | default 'pending' |
| approved_at / completed_at    | timestamptz |                   |
| notes                         | text        |                   |

### inventory_transfer_items

| Columna               | Tipo    | Notas                        |
| --------------------- | ------- | ---------------------------- |
| id                    | uuid    | PK                           |
| transfer_id           | uuid    | NN, → inventory_transfers.id |
| product_id            | uuid    | NN, → products.id            |
| quantity / cost_price | numeric | NN                           |

### price_changes

| Columna               | Tipo    | Notas             |
| --------------------- | ------- | ----------------- |
| id                    | uuid    | PK                |
| product_id            | uuid    | NN, → products.id |
| branch_id             | uuid    | → branches.id     |
| affected_branch_id    | uuid    | NN, → branches.id |
| old_price / new_price | numeric | NN                |
| cost_price            | numeric |                   |
| changed_by            | uuid    | NN, → users.id    |
| reason                | text    |                   |

---

## Productos

### products

| Columna                                                                      | Tipo                                  | Notas                                          |
| ---------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------- |
| id                                                                           | uuid                                  | PK                                             |
| barcode / name                                                               | varchar                               | NN                                             |
| sale_type                                                                    | varchar                               | NN                                             |
| department_id                                                                | uuid                                  | → departments.id                               |
| unit                                                                         | varchar                               | NN                                             |
| cost_price / sale_price                                                      | numeric                               | NN                                             |
| profit                                                                       | numeric                               |                                                |
| tax                                                                          | numeric                               | default 16.00                                  |
| commission_enabled / commission_percent / commission_type / commission_value | boolean / numeric / varchar / numeric | comisión por venta (porcentaje o monto fijo)   |
| clave_sat                                                                    | varchar                               | → sat_claves_productos_servicios.clave         |
| status                                                                       | boolean                               | default true                                   |
| is_global                                                                    | boolean                               | default true (visible en todas las sucursales) |
| is_kit                                                                       | boolean                               | NN, default false                              |
| tracks_inventory                                                             | boolean                               | NN, default true                               |
| max_kits_per_sale                                                            | integer                               | default 1 (límite máximo de kits por venta)    |

### departments

| Columna            | Tipo    | Notas                                       |
| ------------------ | ------- | ------------------------------------------- |
| id                 | uuid    | PK                                          |
| name               | varchar | NN                                          |
| status             | boolean | default true                                |
| commission_enabled | boolean | default false (comisión por venta de depto) |
| commission_type    | varchar | default 'percent' (tipo: percent/flat)      |
| commission_value   | numeric | default 0.00                                |

### product_kits

| Columna        | Tipo    | Notas                                       |
| -------------- | ------- | ------------------------------------------- |
| id             | uuid    | PK                                          |
| kit_product_id | uuid    | NN, → products.id (el producto "kit" en sí) |
| is_active      | boolean | NN, default true                            |

### product_kit_items

| Columna              | Tipo    | Notas                 |
| -------------------- | ------- | --------------------- |
| id                   | uuid    | PK                    |
| kit_id               | uuid    | NN, → product_kits.id |
| component_product_id | uuid    | NN, → products.id     |
| quantity             | numeric | NN                    |

### sale_kit_items

| Columna               | Tipo      | Notas                       |
| --------------------- | --------- | --------------------------- |
| id                    | uuid      | PK, default gen_random_uuid() |
| sale_id               | uuid      | NN, → sales.id              |
| sale_detail_id        | uuid      | NN, → sale_details.id       |
| kit_product_id        | uuid      | NN, → products.id           |
| component_product_id  | uuid      | NN, → products.id           |
| quantity              | numeric   | NN                          |
| branch_id             | uuid      | NN, → branches.id           |
| created_at            | timestamp | default now()               |

### product_discounts

| Columna          | Tipo    | Notas             |
| ---------------- | ------- | ----------------- |
| id               | uuid    | PK                |
| product_id       | uuid    | NN, → products.id |
| enabled          | boolean | NN, default false |
| discount_percent | numeric | NN, default 0     |
| discount_concept | varchar |                   |

---

## Clientes y Recompensas

### customers

| Columna                                                      | Tipo    | Notas                                     |
| ------------------------------------------------------------ | ------- | ----------------------------------------- |
| id                                                           | uuid    | PK                                        |
| name / phone / email                                         | varchar |                                           |
| rfc / razon_social / fiscal_email / postal_code / tax_regime | varchar | datos fiscales, → tax_regimes.id          |
| cfdi_use                                                     | varchar | → cfdi_uses.id                            |
| is_billing_customer / is_points_customer                     | boolean | default false — distingue tipo de cliente |
| status                                                       | boolean | default true                              |

### customer_points

| Columna                | Tipo    | Notas                                 |
| ---------------------- | ------- | ------------------------------------- |
| id                     | uuid    | PK                                    |
| customer_id            | uuid    | NN, → customers.id                    |
| points                 | integer | NN (puede ser negativo, es un ledger) |
| movement_type / source | varchar | NN                                    |
| related_sale_id        | uuid    | → sales.id                            |
| reward_id              | uuid    | → rewards.id                          |
| user_id                | uuid    | → users.id                            |
| branch_id              | uuid    | → branches.id                         |
| notes                  | text    |                                       |

### customer_rewards

| Columna             | Tipo        | Notas                    |
| ------------------- | ----------- | ------------------------ |
| id                  | uuid        | PK                       |
| customer_id         | uuid        | NN, → customers.id       |
| reward_id           | uuid        | NN, → rewards.id         |
| points_used         | integer     | NN                       |
| redeemed_at         | timestamptz |                          |
| user_id / branch_id | uuid        | → users.id / branches.id |

### rewards

| Columna                        | Tipo           | Notas                  |
| ------------------------------ | -------------- | ---------------------- |
| id                             | uuid           | PK                     |
| name / description             | varchar / text |                        |
| points_required                | integer        | NN                     |
| reward_type                    | text           | NN, default 'external' |
| reward_quantity                | integer        | NN, default 1          |
| discount_type / discount_value | text / numeric |                        |
| is_active                      | boolean        | default true           |

### reward_products

| Columna    | Tipo | Notas             |
| ---------- | ---- | ----------------- |
| id         | uuid | PK                |
| reward_id  | uuid | NN, → rewards.id  |
| product_id | uuid | NN, → products.id |

---

## Facturación (CFDI)

### invoices

| Columna                       | Tipo                        | Notas                                     |
| ----------------------------- | --------------------------- | ----------------------------------------- |
| id                            | uuid                        | PK                                        |
| sale_id                       | uuid                        | NN, → sales.id                            |
| customer_id                   | uuid                        | NN, → customers.id                        |
| uuid / serie / folio          | varchar / varchar / integer | identificadores fiscales SAT              |
| cfdi_use                      | varchar                     | NN, → cfdi_uses.id                        |
| payment_method / payment_form | varchar                     | NN, payment_form → payment_forms_sat.code |
| subtotal / tax / total        | numeric                     | NN                                        |
| xml_url / pdf_url             | text                        |                                           |
| is_canceled                   | boolean                     | default false                             |
| branch_id / user_id           | uuid                        | NN                                        |

### invoice_items

| Columna                                                          | Tipo    | Notas             |
| ---------------------------------------------------------------- | ------- | ----------------- |
| id                                                               | uuid    | PK                |
| invoice_id                                                       | uuid    | NN, → invoices.id |
| product_id                                                       | uuid    | → products.id     |
| quantity / unit_price / discount / tax_rate / tax_amount / total | numeric | NN salvo discount |
| description / clave_prod_serv                                    | varchar | NN                |
| branch_id                                                        | uuid    | NN                |

### invoice_payments

| Columna           | Tipo    | Notas                    |
| ----------------- | ------- | ------------------------ |
| id                | uuid    | PK                       |
| invoice_id        | uuid    | NN, → invoices.id        |
| payment_method_id | uuid    | NN, → payment_methods.id |
| amount            | numeric | NN                       |
| currency          | varchar | default 'MXN'            |

### cfdi_settings

| Columna                                                                          | Tipo              | Notas                                                     |
| -------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------- |
| id                                                                               | uuid              | PK                                                        |
| provider                                                                         | varchar           | NN, default 'facturama'                                   |
| environment                                                                      | varchar           | NN, default 'sandbox' — **confirmar valor en producción** |
| issuer_rfc / issuer_name / issuer_postal_code                                    | varchar           | NN                                                        |
| issuer_tax_regime                                                                | varchar           | NN, → tax_regimes.id                                      |
| invoice_series / next_folio                                                      | varchar / integer | folio consecutivo                                         |
| api_username / api_password / api_token                                          | text              | credenciales del PAC                                      |
| connection_status / timbres_available / last_connection_test / last_timbres_sync | —                 | estado de la integración                                  |

### cfdi_uses

| Columna     | Tipo    | Notas                        |
| ----------- | ------- | ---------------------------- |
| id          | varchar | PK (catálogo SAT, ej. "G03") |
| description | varchar | NN                           |
| status      | boolean | default true                 |

### payment_forms_sat

| Columna     | Tipo    | Notas             |
| ----------- | ------- | ----------------- |
| code        | varchar | PK (catálogo SAT) |
| description | varchar | NN                |
| status      | boolean | default true      |

### sat_claves_productos_servicios

| Columna     | Tipo    | Notas             |
| ----------- | ------- | ----------------- |
| clave       | varchar | PK (catálogo SAT) |
| descripcion | text    | NN                |
| status      | boolean | default true      |

### tax_regimes

| Columna     | Tipo    | Notas             |
| ----------- | ------- | ----------------- |
| id          | varchar | PK (catálogo SAT) |
| description | varchar | NN                |
| status      | boolean | default true      |

### postal_codes

| Columna                                         | Tipo    | Notas        |
| ----------------------------------------------- | ------- | ------------ |
| id                                              | uuid    | PK           |
| postal_code / settlement / municipality / state | varchar | NN           |
| settlement_type / city / zone_type              | varchar |              |
| status                                          | boolean | default true |

---

## Catálogos generales

### branches

| Columna                                | Tipo    | Notas                        |
| -------------------------------------- | ------- | ---------------------------- |
| id                                     | uuid    | PK                           |
| code / name                            | varchar | NN                           |
| phone / email / address / city / state | —       |                              |
| timezone                               | text    | NN, default 'America/Cancun' |

### payment_methods

| Columna      | Tipo    | Notas                                                                         |
| ------------ | ------- | ----------------------------------------------------------------------------- |
| id           | uuid    | PK                                                                            |
| name         | varchar | NN                                                                            |
| is_active    | boolean | default true                                                                  |
| affects_cash | boolean | NN, default false — distingue efectivo de otros métodos para el corte de caja |

---

## Seguridad y Roles

> Ver `PERMISSIONS.md` para la explicación funcional completa de este bloque (quién puede hacer qué).

### users (public.users — no confundir con auth.users de Supabase Auth)

| Columna  | Tipo    | Notas                                                       |
| -------- | ------- | ----------------------------------------------------------- |
| id       | uuid    | PK, mismo id que auth.users                                 |
| username | varchar | NN — usado para login local (ver `get_email_by_username()`) |
| email    | text    |                                                             |
| role_id  | uuid    | NN, → roles.id                                              |
| status   | boolean | default true — desactivar usuario sin borrarlo              |

### roles

| Columna | Tipo    | Notas                                    |
| ------- | ------- | ---------------------------------------- |
| id      | uuid    | PK                                       |
| name    | varchar | NN (valores actuales: `admin`, `cajero`) |
| status  | boolean | default true                             |

### permissions

| Columna | Tipo    | Notas                                                            |
| ------- | ------- | ---------------------------------------------------------------- |
| id      | uuid    | PK                                                               |
| name    | varchar | NN (valores actuales: `can_manage_inventory`, `can_view_branch`) |

### role_permissions (tabla puente, columnas inferidas de la función `has_permission()`)

| Columna       | Notas            |
| ------------- | ---------------- |
| role_id       | → roles.id       |
| permission_id | → permissions.id |

### user_roles (tabla puente alterna, permite roles múltiples por usuario — inferida de `has_permission()`)

| Columna | Notas      |
| ------- | ---------- |
| user_id | → users.id |
| role_id | → roles.id |

### user_branches

| Columna      | Tipo    | Notas              |
| ------------ | ------- | ------------------ |
| id           | uuid    | PK                 |
| user_id      | uuid    | NN, → users.id     |
| branch_id    | uuid    | NN, → branches.id  |
| access_level | varchar | NN, default 'view' |
| is_active    | boolean | NN, default true   |

### user_sessions

| Columna        | Tipo      | Notas                        |
| -------------- | --------- | ---------------------------- |
| id             | uuid      | PK, default gen_random_uuid() |
| user_id        | uuid      | NN → users.id                |
| branch_id      | uuid      | NN, → branches.id            |
| session_token  | varchar   | NN, único                    |
| ip_address     | varchar   |                              |
| user_agent     | text      |                              |
| started_at     | timestamp | default now()                |
| ended_at       | timestamp |                              |
| status         | varchar   | default 'active'             |

---

## Auditoría

### audit_logs

| Columna                 | Tipo           | Notas                  |
| ----------------------- | -------------- | ---------------------- |
| id                      | uuid           | PK                     |
| user_id                 | uuid           | NN, → users.id         |
| branch_id               | uuid           | → branches.id          |
| entity / entity_id      | varchar / uuid | qué se modificó        |
| action                  | varchar        | NN                     |
| description             | varchar        |                        |
| old_values / new_values | jsonb          | snapshot antes/después |

---

## Configuración

### app_settings

| Columna     | Tipo        | Notas                                       |
| ----------- | ----------- | ------------------------------------------- |
| key         | text        | PK (ej. `cash_register.max_opening_amount`) |
| value       | jsonb       | NN                                          |
| description | text        |                                             |
| updated_at  | timestamptz | default now()                               |
| updated_by  | uuid        | → users.id                                  |

Creada en la migración `20260914130000`. RLS activa y sin grants para `anon`/`authenticated`: solo
la leen/escriben las RPC `SECURITY DEFINER` (owner) o `service_role`. El panel de configuración que
escribirá estos valores queda pendiente (ver `KNOWN_ISSUES.md` #33). El tope de apertura de caja se
expone vía `get_cash_max_opening_amount` / `update_cash_max_opening_amount`.

### system_settings

| Columna       | Tipo      | Notas                        |
| ------------- | --------- | ---------------------------- |
| id            | uuid      | PK, default gen_random_uuid() |
| setting_key   | varchar   | NN                           |
| setting_value | text      | NN                           |
| value_type    | varchar   | NN                           |
| description   | text      |                              |
| branch_id     | uuid      | → branches.id (índice único por key+branch) |
| is_active     | boolean   | default true                 |
| created_at    | timestamp | default now()                |
| updated_at    | timestamp | default now() (trigger `trg_system_settings_set_updated_at`) |

---

## Funciones (RPC) relevantes

Detectadas en `information_schema.routines` (introspección 23 sep 2026: **37 funciones**). Las
funciones transaccionales (`create_*`, `cancel_*`, `update_*`, `delete_*`, `import_*`) son
`SECURITY DEFINER` con `SET search_path TO 'public'` y grants restringidos a `authenticated`
(revisadas en el despliegue del 23 sep 2026). Ver `KNOWN_ISSUES.md` punto 5 para entender por qué se
prefiere RPC atómica sobre cliente con múltiples queries.

| Función                                                                                | Devuelve      | Uso aparente                                                                                                                         |
| -------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `create_sale_transaction`                                                              | uuid          | Crea una venta de forma atómica (existen 3 sobrecargas — confirmar cuál usa el frontend)                                             |
| `cancel_sale_transaction`                                                              | uuid          | Cancelación de venta (atómica, reemplaza al flujo cliente)                                                                           |
| `cancel_sale`                                                                          | void          | Cancelación de venta (legacy no transaccional, sin `SECURITY DEFINER`)                                                               |
| `create_partial_return_transaction`                                                    | uuid          | Devolución parcial (atómica; alimenta `sale_returns`/`sale_return_items`)                                                            |
| `complete_sale`                                                                        | void          | Legacy no transaccional                                                                                                              |
| `create_kit_transaction` / `update_kit_transaction` / `delete_kit_transaction`         | uuid / uuid / void | CRUD atómico de kits de productos (ver `KNOWN_ISSUES.md` #5, `20260923150000`)                                            |
| `import_products_transaction`                                                          | jsonb         | Importación masiva de productos (atómica, ver `KNOWN_ISSUES.md` #5, `20260923160000`)                                               |
| `create_transfer_order` / `receive_transfer_order` / `cancel_transfer_order`           | jsonb         | Transferencias entre sucursales — **ya atómicas vía RPC**                                                                            |
| `close_cash_register_session`                                                          | jsonb         | Cierre de caja                                                                                                                       |
| `open_cash_register` / `get_cash_register_session`                                     | jsonb         | Apertura/consulta de caja (códigos `CASH_ALREADY_OPEN_*` y `CASH_INVALID_AMOUNT`)                                                    |
| `get_cash_max_opening_amount` / `update_cash_max_opening_amount`                       | numeric / void | Tope de apertura desde `app_settings` (ver `KNOWN_ISSUES.md` #33)                                                                    |
| `get_sales_report_kpis` / `get_commissions_report_data` / `get_inventory_report_data` / `get_cash_report_sessions` | record / jsonb | Datasets para reportes de ventas, comisiones, inventario y caja                                   |
| `get_branch_products_paginated`                                                        | jsonb         | Catálogo paginado de productos por sucursal                                                                                          |
| `has_permission` / `is_admin` / `_user_can_access_branch`                              | boolean       | Permisos (ver `PERMISSIONS.md`)                                                                                                      |
| `get_email_by_username`                                                                | text          | Traduce username local a email para login contra Supabase Auth                                                                       |
| `get_branch_by_device`                                                                 | jsonb         | Login pre-auth: traduce `device_code` a la sucursal asignada (anon + `SECURITY DEFINER`; ver `KNOWN_ISSUES.md` #30)                  |
| `_cash_session_payload` / `_cash_already_open_response` / `_cash_max_opening_amount`   | jsonb / jsonb / numeric | Helpers internos de caja (prefijo `_`, sin grants)                                                     |
| `_apply_inventory_delta` / `_build_transfer_notes`                                     | record / text | Helpers internos (prefijo `_`)                                                                                                       |

**Triggers (9)** (nombres reales de la introspección):
`trg_sales_set_updated_at`, `trg_products_updated_at`, `trg_branch_inventory_set_updated_at`,
`trg_product_discounts_updated_at`, `trg_system_settings_set_updated_at`
(funciones `set_updated_at`), `trg_enforce_sale_branch_details` / `trg_prevent_edit_sale_details`
(sobre `sale_details`) y `trg_enforce_sale_branch_payments` / `trg_prevent_edit_sale_payments`
(sobre `sale_payments`).

**Nota (actualizada 23 sep 2026):** ya existen RPC atómicas para kits (`create_kit_transaction`,
`update_kit_transaction`, `delete_kit_transaction`) e importación masiva (`import_products_transaction`),
desplegadas en producción. Con esto el cliente de Electron ya no necesita mutar `product_kits`,
`product_kit_items` ni `products` directamente para esos flujos (ver `KNOWN_ISSUES.md` #5).
