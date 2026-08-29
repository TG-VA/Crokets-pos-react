### SCHEMA.md — Inventario de datos (SQLite local + Supabase remoto)

Este documento es un **inventario de tablas y columnas** del schema `public` de Supabase, generado
por introspección directa (`information_schema`) el 24 de agosto de 2026. No sustituye el detalle
completo del Dashboard de Supabase, pero permite entender la estructura del proyecto sin salir del
repositorio. Si el schema cambia, este documento debe regenerarse — ver
`supabase_schema_introspection.sql` en la raíz del repo (o donde el equipo decida guardarlo) para
las queries usadas.

**Pendiente:** no hay migraciones SQL versionadas en `supabase/migrations/` (ver `KNOWN_ISSUES.md`
punto 6). Este documento es actualmente la única referencia de schema versionada en Git.

**Convención:** `NN` = NOT NULL. FK se indica como `→ tabla.columna`.

---

## Ventas y Caja

### sales
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | NN, → users.id |
| customer_id | uuid | → customers.id |
| branch_id | uuid | NN, → branches.id |
| sale_date | timestamptz | default now() |
| subtotal | numeric | NN |
| tax | numeric | default 16.00 |
| total | numeric | NN |
| status | varchar | default 'completed' |
| client_sale_token | uuid | idempotencia del cliente (POS) |
| discount_total | numeric | default 0 |
| notes | text | |

### sale_details
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| sale_id | uuid | NN, → sales.id |
| product_id | uuid | NN, → products.id |
| branch_id | uuid | NN, → branches.id |
| quantity | integer | NN |
| unit_price / final_unit_price / original_unit_price | numeric | precio aplicado vs. original |
| total_price | numeric | NN |
| discount_type / discount_value / discount_amount | varchar / numeric / numeric | descuento por línea |

### sale_payments
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| sale_id | uuid | NN, → sales.id |
| payment_method_id | uuid | NN, → payment_methods.id |
| branch_id | uuid | NN, → branches.id |
| amount | numeric | NN |
| currency | varchar | default 'MXN' |
| exchange_rate | numeric | default 1 |
| reference | text | folio/autorización externa |

### sale_reward_redemptions
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| sale_id | uuid | NN, → sales.id |
| sale_detail_id | uuid | → sale_details.id |
| customer_id | uuid | NN, → customers.id |
| reward_id | uuid | NN, → rewards.id |
| product_id | uuid | → products.id |
| branch_id | uuid | NN, → branches.id |
| user_id | uuid | NN, → users.id |
| quantity | numeric | default 1 |
| points_per_unit / total_points | integer | NN |
| unit_price / discount_amount | numeric | default 0 |
| reward_name / product_name | text | copia histórica del nombre |
| status | text | default 'applied' |
| reversed_at / reversed_by / reversal_reason | timestamptz / uuid / text | soporte de reversión |

### canceled_sales
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| sale_id | uuid | NN, → sales.id |
| user_id | uuid | NN, → users.id |
| branch_id | uuid | NN, → branches.id |
| cancel_reason | text | NN |
| refund_amount | numeric | |
| refund_method_id | uuid | → payment_methods.id |
| canceled_at | timestamptz | |

### cash_register_sessions
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | NN, → users.id |
| branch_id | uuid | NN, → branches.id |
| opening_amount | numeric | NN |
| closing_amount | numeric | |
| opened_at / closed_at | timestamptz | |
| status | varchar | default 'open' |
| difference | numeric | default 0 |

### cash_movements
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| session_id | uuid | NN, → cash_register_sessions.id |
| user_id | uuid | NN, → users.id |
| branch_id | uuid | NN, → branches.id |
| movement_type | varchar | NN (entrada/salida de efectivo fuera de venta) |
| amount | numeric | NN |
| description | text | |

### cash_cuts
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| branch_id | uuid | NN, → branches.id |
| user_id | uuid | NN, → users.id |
| cash_register_session_id | uuid | → cash_register_sessions.id |
| cut_type | varchar | NN |
| expected_amount / counted_amount / difference | numeric | NN |
| cut_date | date | NN |
| notes | text | |

### cash_cut_details
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| cash_cut_id | uuid | NN, → cash_cuts.id |
| payment_method_id | uuid | NN, → payment_methods.id |
| expected_amount / counted_amount / difference | numeric | NN, desglose por método de pago |

### pos_devices
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| device_code | text | NN |
| branch_id | uuid | NN, → branches.id |
| is_active | boolean | default true |

---

## Inventario

### branch_inventory
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| branch_id | uuid | NN, → branches.id |
| product_id | uuid | NN, → products.id |
| stock | numeric | NN, default 0 |
| min_stock / max_stock | numeric | umbrales de alerta |
| cost_price / sale_price | numeric | NN — precio por sucursal |
| is_active | boolean | default true |
| has_been_stocked | boolean | NN, default false |

### inventory_movements
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| product_id | uuid | NN, → products.id |
| branch_id | uuid | NN, → branches.id |
| related_branch_id | uuid | → branches.id (transferencias) |
| movement_type | varchar | NN |
| quantity / previous_stock / new_stock | integer | NN |
| sale_id | uuid | → sales.id |
| user_id | uuid | → users.id |
| reason | text | |

### inventory_adjustments
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| branch_id | uuid | NN, → branches.id |
| product_id | uuid | NN, → products.id |
| user_id | uuid | NN, → users.id |
| previous_stock / new_stock / difference | numeric | NN |
| reason | varchar | NN |
| notes | text | |

### inventory_transfers
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| from_branch_id / to_branch_id | uuid | NN, → branches.id |
| user_id | uuid | NN, → users.id |
| status | varchar | default 'pending' |
| approved_at / completed_at | timestamptz | |
| notes | text | |

### inventory_transfer_items
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| transfer_id | uuid | NN, → inventory_transfers.id |
| product_id | uuid | NN, → products.id |
| quantity / cost_price | numeric | NN |

### price_changes
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| product_id | uuid | NN, → products.id |
| branch_id | uuid | → branches.id |
| affected_branch_id | uuid | NN, → branches.id |
| old_price / new_price | numeric | NN |
| cost_price | numeric | |
| changed_by | uuid | NN, → users.id |
| reason | text | |

---

## Productos

### products
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| barcode / name | varchar | NN |
| sale_type | varchar | NN |
| department_id | uuid | → departments.id |
| unit | varchar | NN |
| cost_price / sale_price | numeric | NN |
| profit | numeric | |
| tax | numeric | default 16.00 |
| commission_enabled / commission_percent / commission_type / commission_value | boolean / numeric / varchar / numeric | comisión por venta (porcentaje o monto fijo) |
| clave_sat | varchar | → sat_claves_productos_servicios.clave |
| status | boolean | default true |
| is_global | boolean | default true (visible en todas las sucursales) |
| is_kit | boolean | NN, default false |
| tracks_inventory | boolean | NN, default true |

### departments
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| name | varchar | NN |
| status | boolean | default true |
| commission_enabled | boolean | default false (comisión por venta de depto) |
| commission_type | varchar | default 'percent' (tipo: percent/flat) |
| commission_value | numeric | default 0.00 |

### product_kits
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| kit_product_id | uuid | NN, → products.id (el producto "kit" en sí) |
| is_active | boolean | NN, default true |

### product_kit_items
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| kit_id | uuid | NN, → product_kits.id |
| component_product_id | uuid | NN, → products.id |
| quantity | numeric | NN |

### product_discounts
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| product_id | uuid | NN, → products.id |
| enabled | boolean | NN, default false |
| discount_percent | numeric | NN, default 0 |
| discount_concept | varchar | |

---

## Clientes y Recompensas

### customers
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| name / phone / email | varchar | |
| rfc / razon_social / fiscal_email / postal_code / tax_regime | varchar | datos fiscales, → tax_regimes.id |
| cfdi_use | varchar | → cfdi_uses.id |
| is_billing_customer / is_points_customer | boolean | default false — distingue tipo de cliente |
| status | boolean | default true |

### customer_points
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| customer_id | uuid | NN, → customers.id |
| points | integer | NN (puede ser negativo, es un ledger) |
| movement_type / source | varchar | NN |
| related_sale_id | uuid | → sales.id |
| reward_id | uuid | → rewards.id |
| user_id | uuid | → users.id |
| branch_id | uuid | → branches.id |
| notes | text | |

### customer_rewards
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| customer_id | uuid | NN, → customers.id |
| reward_id | uuid | NN, → rewards.id |
| points_used | integer | NN |
| redeemed_at | timestamptz | |
| user_id / branch_id | uuid | → users.id / branches.id |

### rewards
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| name / description | varchar / text | |
| points_required | integer | NN |
| reward_type | text | NN, default 'external' |
| reward_quantity | integer | NN, default 1 |
| discount_type / discount_value | text / numeric | |
| is_active | boolean | default true |

### reward_products
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| reward_id | uuid | NN, → rewards.id |
| product_id | uuid | NN, → products.id |

---

## Facturación (CFDI)

### invoices
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| sale_id | uuid | NN, → sales.id |
| customer_id | uuid | NN, → customers.id |
| uuid / serie / folio | varchar / varchar / integer | identificadores fiscales SAT |
| cfdi_use | varchar | NN, → cfdi_uses.id |
| payment_method / payment_form | varchar | NN, payment_form → payment_forms_sat.code |
| subtotal / tax / total | numeric | NN |
| xml_url / pdf_url | text | |
| is_canceled | boolean | default false |
| branch_id / user_id | uuid | NN |

### invoice_items
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| invoice_id | uuid | NN, → invoices.id |
| product_id | uuid | → products.id |
| quantity / unit_price / discount / tax_rate / tax_amount / total | numeric | NN salvo discount |
| description / clave_prod_serv | varchar | NN |
| branch_id | uuid | NN |

### invoice_payments
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| invoice_id | uuid | NN, → invoices.id |
| payment_method_id | uuid | NN, → payment_methods.id |
| amount | numeric | NN |
| currency | varchar | default 'MXN' |

### cfdi_settings
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| provider | varchar | NN, default 'facturama' |
| environment | varchar | NN, default 'sandbox' — **confirmar valor en producción** |
| issuer_rfc / issuer_name / issuer_postal_code | varchar | NN |
| issuer_tax_regime | varchar | NN, → tax_regimes.id |
| invoice_series / next_folio | varchar / integer | folio consecutivo |
| api_username / api_password / api_token | text | credenciales del PAC |
| connection_status / timbres_available / last_connection_test / last_timbres_sync | — | estado de la integración |

### cfdi_uses
| Columna | Tipo | Notas |
|---|---|---|
| id | varchar | PK (catálogo SAT, ej. "G03") |
| description | varchar | NN |
| status | boolean | default true |

### payment_forms_sat
| Columna | Tipo | Notas |
|---|---|---|
| code | varchar | PK (catálogo SAT) |
| description | varchar | NN |
| status | boolean | default true |

### sat_claves_productos_servicios
| Columna | Tipo | Notas |
|---|---|---|
| clave | varchar | PK (catálogo SAT) |
| descripcion | text | NN |
| status | boolean | default true |

### tax_regimes
| Columna | Tipo | Notas |
|---|---|---|
| id | varchar | PK (catálogo SAT) |
| description | varchar | NN |
| status | boolean | default true |

### postal_codes
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| postal_code / settlement / municipality / state | varchar | NN |
| settlement_type / city / zone_type | varchar | |
| status | boolean | default true |

---

## Catálogos generales

### branches
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| code / name | varchar | NN |
| phone / email / address / city / state | — | |
| timezone | text | NN, default 'America/Cancun' |

### payment_methods
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| name | varchar | NN |
| is_active | boolean | default true |
| affects_cash | boolean | NN, default false — distingue efectivo de otros métodos para el corte de caja |

---

## Seguridad y Roles

> Ver `PERMISSIONS.md` para la explicación funcional completa de este bloque (quién puede hacer qué).

### users (public.users — no confundir con auth.users de Supabase Auth)
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK, mismo id que auth.users |
| username | varchar | NN — usado para login local (ver `get_email_by_username()`) |
| email | text | |
| role_id | uuid | NN, → roles.id |
| status | boolean | default true — desactivar usuario sin borrarlo |

### roles
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| name | varchar | NN (valores actuales: `admin`, `cajero`) |
| status | boolean | default true |

### permissions
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| name | varchar | NN (valores actuales: `can_manage_inventory`, `can_view_branch`) |

### role_permissions (tabla puente, columnas inferidas de la función `has_permission()`)
| Columna | Notas |
|---|---|
| role_id | → roles.id |
| permission_id | → permissions.id |

### user_roles (tabla puente alterna, permite roles múltiples por usuario — inferida de `has_permission()`)
| Columna | Notas |
|---|---|
| user_id | → users.id |
| role_id | → roles.id |

### user_branches
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | NN, → users.id |
| branch_id | uuid | NN, → branches.id |
| access_level | varchar | NN, default 'view' |
| is_active | boolean | NN, default true |

---

## Auditoría

### audit_logs
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | NN, → users.id |
| branch_id | uuid | → branches.id |
| entity / entity_id | varchar / uuid | qué se modificó |
| action | varchar | NN |
| description | varchar | |
| old_values / new_values | jsonb | snapshot antes/después |

---

## Funciones (RPC) relevantes

Detectadas en `information_schema.routines`, útiles como referencia antes de crear nuevas RPC (ver
`KNOWN_ISSUES.md` punto 5):

| Función | Devuelve | Uso aparente |
|---|---|---|
| `create_sale_transaction` | uuid | Crea una venta de forma atómica (existen 3 sobrecargas — confirmar cuál usa el frontend) |
| `complete_sale` | void | |
| `cancel_sale` / `cancel_sale_transaction` | void / uuid | Cancelación de venta |
| `create_partial_return_transaction` | uuid | Devoluciones parciales |
| `create_transfer_order` / `receive_transfer_order` / `cancel_transfer_order` | jsonb | Transferencias entre sucursales — **ya atómicas vía RPC** |
| `close_cash_register_session` | jsonb | Cierre de caja |
| `get_sales_report_kpis` | record | KPIs para reportes |
| `has_permission` / `is_admin` | boolean | Ver `PERMISSIONS.md` |
| `get_email_by_username` | text | Traduce username local a email para login contra Supabase Auth |
| `_apply_inventory_delta` / `_build_transfer_notes` | record / text | Helpers internos (prefijo `_`) |
| `enforce_sale_branch_consistency` / `prevent_edit_if_sale_not_open` / `set_updated_at` | trigger | Triggers de integridad |

**Nota para `KNOWN_ISSUES.md` punto 5:** las transferencias entre sucursales y las ventas ya usan
RPC atómica. Los módulos pendientes de migrar a RPC (Importación masiva y Kits de Productos) siguen
sin tener función equivalente — no aparece ninguna RPC de import/kits en esta lista.
