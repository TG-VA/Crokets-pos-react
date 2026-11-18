### PERMISSIONS.md — Roles y permisos

Este proyecto tiene **dos sistemas de control de acceso distintos y separados**. Es importante no
confundirlos al agregar features nuevas, y tener en cuenta que **no están sincronizados entre sí**
(ver `KNOWN_ISSUES.md` punto 10).

---

## 1. Sistema remoto — Supabase (roles + permisos + RLS)

Este es el sistema real que protege los datos a nivel de base de datos, vía Row Level Security
(RLS). Se basa en 5 tablas:

```
users (role_id) ──► roles ──► role_permissions ──► permissions
   │
   └──► user_roles ──► roles         (camino alterno: roles múltiples por usuario)
```

- **`users.role_id`** asigna un rol principal a cada usuario.
- **`role_permissions`** es la tabla puente que define qué permisos tiene cada rol.
- **`user_roles`** permite además asignar roles adicionales directamente a un usuario, sin pasar
  por `role_id` (camino alterno soportado por `has_permission()`, no confirmado si está en uso).

### Funciones de autorización

**`is_admin()`** — verifica si el usuario autenticado (`auth.uid()`) tiene un rol llamado
literalmente `admin` y está activo (`status = true`).

**`has_permission(p_name text)`** — verifica si el usuario autenticado tiene el permiso `p_name`,
ya sea vía su `role_id` directo o vía `user_roles`. Se usa dentro de las políticas RLS, por ejemplo:

```sql
-- Política real en branch_inventory:
USING (has_permission('can_manage_inventory'))
```

### Roles existentes (datos reales al 24 de agosto de 2026)

| Rol      | Estado |
| -------- | ------ |
| `admin`  | activo |
| `cajero` | activo |

No existe un rol `gerente` todavía, a diferencia de lo que sugería la versión anterior de este
documento — si se necesita, hay que crearlo explícitamente en `roles` y asignarle permisos en
`role_permissions`.

### Permisos existentes

| Permiso                | Habilita (según su uso en RLS)                 |
| ---------------------- | ---------------------------------------------- |
| `can_manage_inventory` | Insertar/editar/eliminar en `branch_inventory` |
| `can_view_branch`      | Consultar `branch_inventory`                   |

### Matriz rol × permiso (real, no aspiracional)

|            | `can_manage_inventory` | `can_view_branch` |
| ---------- | ---------------------- | ----------------- |
| **admin**  | Sí                     | Sí                |
| **cajero** | Sí                     | Sí                |

> **Hallazgo relevante:** actualmente `admin` y `cajero` tienen exactamente los mismos permisos.
> El sistema de roles está montado a nivel de base de datos, pero **todavía no diferencia nada
> entre ambos roles** — cualquier usuario autenticado con cualquiera de los dos roles puede hacer
> lo mismo según RLS. Además, solo 2 de los ~40 módulos del sistema (`branch_inventory`) usan
> `has_permission()` de verdad; el resto de las políticas RLS revisadas (`sales`, `sale_details`,
> `sale_payments`, `customers`, `reward_products`, etc.) usan `USING (true)` para cualquier usuario
> autenticado, sin chequeo de permiso granular. Esto no es necesariamente un bug — puede ser una
> decisión consciente de que "todo el que inició sesión es de confianza" — pero vale la pena
> confirmarlo con el equipo y, si no fue intencional, agregarlo a `KNOWN_ISSUES.md` como pendiente
> de seguridad.

### Usuarios reales (`public.users` × `auth.users`, 24 de agosto de 2026)

| Email                    | Rol    | Activo |
| ------------------------ | ------ | ------ |
| carlos@internal.crokets  | admin  | sí     |
| tristan@internal.crokets | admin  | sí     |
| kari@internal.crokets    | cajero | sí     |
| alexander@example.com    | cajero | sí     |

> `alexander@example.com` no sigue la convención `@internal.crokets` de los demás usuarios —
> confirmar si es una cuenta de prueba que debería eliminarse antes de producción.

### Otras tablas relacionadas

- **`user_branches`** — controla a qué sucursales tiene acceso cada usuario, independientemente de
  su rol. Tiene su propio campo `access_level` (default `'view'`) y su propia política RLS
  (`user_branches_admin_write`, que usa `is_admin()` directamente en vez de `has_permission()`).
  Esto es un segundo nivel de control: rol (qué puede hacer) + sucursal (dónde puede hacerlo).

### Matriz RLS revisada (17 sep 2026)

Introspección directa de `pg_policies` + `pg_class.relrowsecurity` sobre el proyecto remoto. El
control real por tabla queda así:

| Estado                   | Tablas (ejemplos)                                                                          | Control real                                           |
| ------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| RLS + `is_admin()`       | `user_branches` (escritura)                                                                | solo `admin` escribe; cada usuario ve sus filas        |
| RLS + `has_permission()` | `branch_inventory`                                                                         | único módulo con permiso granular                      |
| RLS + `USING (true)`     | `sales`, `sale_details`, `sale_payments`, `reward_products`, `sale_reward_redemptions`     | cualquier `authenticated`, sin importar el rol         |
| RLS + dueño de fila      | `cash_register_sessions`, `cash_movements`                                                 | cada usuario su propia sesión/movimientos              |
| RLS + lectura `anon`     | `postal_codes`, `tax_regimes`                                                              | catálogos de lectura pre/post login                    |
| RLS sin políticas        | `app_settings`, `cfdi_settings`                                                            | deny-all salvo owner/RPC                               |
| Sin RLS, solo lectura    | `users`, `roles`, `permissions`, `role_permissions`, `user_roles` (desde `20261118140000`) | escritura solo por RPC con `is_admin()` o service role |
| RLS deshabilitado        | `products`, `customers`, `departments`, `invoices`, `inventory_*`, `cash_cuts`, etc.       | acceso por `GRANT` de tabla, sin filtrado de filas     |

**Hallazgo (KNOWN_ISSUES #13):** `admin` y `cajero` tienen exactamente los mismos permisos
(`can_manage_inventory`, `can_view_branch`). No existe hoy ninguna diferencia de autorización a
nivel de base de datos entre ambos roles, salvo `user_branches` + `is_admin()` y la RPC
`import_products_transaction` (ver "Importar productos: solo administradores" abajo).

**Decisión (17 sep 2026, KNOWN_ISSUES #10/#13):** se adopta el modelo "hardening sin habilitar RLS".
No se habilita RLS ni se exige `is_admin()` en las mutaciones administrativas (catálogo, bajas de
clientes, retiros de caja; la excepción posterior es `import_products_transaction`) porque
activar RLS sobre ~37 tablas sin políticas rompería el acceso y el modelo vigente es
`authenticated` de confianza. Se documenta como **riesgo aceptado**: el gateo de acciones
administrativas en el cliente (#38) **no es un control de seguridad** y cualquier usuario
autenticado puede saltárselo. La mitigación aplicada sobre las RPCs transaccionales se detalla abajo.

**Usuarios y roles: escritura solo para administradores (17 nov 2026, migración `20261118140000`,
KNOWN_ISSUES #95).** `anon` y `authenticated` ya no pueden escribir en `users`, `roles`,
`permissions`, `role_permissions` ni `user_roles`; antes cualquiera podía cambiar su `role_id` a
`admin` y saltar `is_admin()`. Configuración > Usuarios guarda con `admin_update_user` y
`admin_set_user_status`, que exigen `is_admin()` sobre `auth.uid()` (`42501` si no) e impiden que
un administrador se quite su propio rol o se desactive. Un cajero con autorización del modal puede
entrar a la pantalla, pero no guardar.

**Kits: editar y eliminar solo para administradores (1 nov 2026, rama `feat/kits-vigencia-por-fechas`).**
En Promociones y Kits, los botones Editar, Eliminar y Renovar vigencia solo se muestran si el hook `useIsAdmin`
(`src/hooks/useIsAdmin.js`, sobre `checkUserIsAdmin`) confirma que el usuario es administrador. Es
**gateo de interfaz, no un control de seguridad**: entra en el riesgo aceptado de
`KNOWN_ISSUES.md` #10/#13/#38. No se creó permiso ni rol nuevo, así que la tabla de permisos no cambia.
Aplicarlo en base de datos requeriría una migración.

**Inventario > Agregar: autorización de administrador (17 nov 2026, PR #211).**
La sección Agregar de Inventario (`/inventory/agregar`) se envuelve en `ProtectedRoute` con la acción
`inventory_add_access` (`PROTECTED_INVENTORY_SECTIONS` en `src/config/adminProtectedSections.js`) y
la pestaña de `NavbarInventory` abre `AdminAuthorizationModal` a quien no es administrador. Un cajero
entra si un administrador autoriza.

Desde la migración `20261117235000` también es control en base de datos: `add_inventory_entry`
exige `is_admin()` o una autorización vigente en `admin_action_grants`. Como la autorización del
modal no cambia la sesión, `authorize-admin-action` registra para `inventory_add_access` una fila a
nombre del usuario que llama, para la sucursal, con 30 minutos de vigencia. Pasado ese plazo la RPC
rechaza el alta y Agregar vuelve a abrir el modal en la misma pantalla; al autorizar, reintenta el
alta sin perder la captura.

**Importar productos: solo administradores (10 nov 2026, migración `20261110130000`).**
`import_products_transaction` es la primera RPC que exige `public.is_admin()` sobre `auth.uid()`:
rechaza con `Solo un administrador puede importar productos.` antes de insertar. Es control en base
de datos, no solo de interfaz. El hook `useProductsImport` comprueba el rol con `checkUserIsAdmin`
antes de crear departamentos faltantes, para que un usuario no admin no deje catálogo creado.
Además, la pantalla `ProductsImports` usa `useIsAdmin` y a quien no es administrador solo le muestra
ese mensaje, sin carga de archivo ni plantilla. Este ocultamiento es de interfaz; el control real es
la RPC.

### Endurecimiento de RPCs transaccionales (`20260917200000`, 17 sep 2026)

Las RPCs que mueven dinero o inventario (`create_sale_transaction` ×3, `cancel_sale_transaction`,
`create_partial_return_transaction`, `create_transfer_order`, `cancel_transfer_order`,
`receive_transfer_order`, `cancel_sale`, `complete_sale`) ya no conceden `EXECUTE` a `anon` ni a
`PUBLIC` (solo `authenticated`/`service_role`) y fijan el actor con `p_user_id := coalesce(auth.uid(),
p_user_id)`, de modo que un usuario autenticado no puede suplantar a otro pasando un `p_user_id`
ajeno. `add_inventory_entry` (`20261117230000`, PR #211) sigue el mismo criterio: revoca `anon` y
`PUBLIC` y no recibe `p_user_id`; toma el actor directamente de `auth.uid()`. `auth.uid()` es el mismo valor que `public.users.id` (así lo resuelve `is_admin()`). Cierra el
acceso anónimo y la suplantación, no la ausencia de RLS. Ver `docs/SUPABASE_MIGRATIONS.md`.

### Excepción de autorización pre-auth (`get_branch_by_device`)

`get_branch_by_device` (migración `20260914120000`) es la única función `anon`-ejecutable que rompe
RLS (`SECURITY DEFINER`). Es necesaria porque el login resuelve la sucursal del equipo por
`device_code` **antes** de autenticar. Devuelve solo `{ id, name, code }` de la sucursal activa y se
apoya en que `device_code` es un UUID (`crypto.randomUUID()`, `electron/main.js`) no enumerable.
Riesgo aceptado y monitoreado; ver `KNOWN_ISSUES.md` #30 y `docs/SUPABASE_MIGRATIONS.md`.

---

### Sucursales administrativas (`branches.branch_type`, 15 nov 2026)

`branches.branch_type` vale `operational` (default) o `admin`. Una sucursal admin (hoy `ADM-BREN`)
no vende, no cobra ni tiene stock; sí ve reportes, crea pedidos y traspasos y da de alta productos.

- **Fuente única del filtro:** `src/services/branchScopeService.js` (`fetchOperationalBranches`,
  `fetchAllBranches`) y sus reglas puras en `branchScopeCalculationService.js`
  (`BRANCH_TYPES`, `isOperationalBranch`, `isAdminBranch`, `resolveStockOriginId`). Ningún otro
  módulo filtra por `branch_type`.
- **Dónde no aparece:** selectores de origen y destino de traspasos y pedidos, reporte de
  inventario, movimientos, cobertura de kits, buscador de ventas (stock en otras sucursales) y
  filtros de sucursal de los reportes. Sí aparece en Ajustes > Sucursales, login y perfil de
  terminal.
- **Terminal admin:** elige origen y destino entre operativas (sin origen preseleccionado). Los
  reportes ya arrancan en "todas las sucursales", que solo contiene operativas.
- **Acceso por tipo de sucursal:** `canBranchAccessPath` en `src/lib/permissionsService.js` bloquea
  Ventas (`/dashboard`, `/sales`), Corte (`/cashcut`) y Facturación (`/invoices`). `AuthGuard`
  redirige a `/reports` y la `Navbar` oculta esos botones y sus atajos. Es independiente del rol
  del usuario, que se sigue resolviendo con `AuthContext` y `checkUserIsAdmin`.
- **Servidor:** `20261115140000_reject_admin_branch_stock.sql` agrega triggers que rechazan una
  sucursal admin en `sales`, `inventory_movements`, `inventory_transfers` y `store_orders`, de modo
  que las RPCs transaccionales fallan con "La sucursal ... es administrativa" aunque la UI se salte.
  `20261115160000` agrega el mismo trigger en `branch_inventory`: el alta y la edición de
  productos desde una terminal admin no escriben inventario y la importación se bloquea.
- **Caja:** `branchRequiresCashRegister` hace que una terminal admin no abra caja; `AuthGuard` la
  lleva de `/cash-register` a `/reports`.
- **Caché:** `BranchProvider` refresca `branch_type` al montar, así una terminal con sesión previa
  se entera de que es admin sin volver a iniciar sesión.
- Pendientes conocidos: `KNOWN_ISSUES.md` #87 y #89.

## 2. Sistema local — SQLite embebido (`src/backend/bd.js`)

Este es el sistema que usa el backend Express local para el login, **independiente de Supabase
Auth**. Tras resolver `KNOWN_ISSUES.md` #1, el renderer ya no consume este backend (los flujos de
dispositivo y caja se migraron a RPCs de Supabase y sus endpoints Express se eliminaron); queda solo
como login legacy por SQLite para desarrollo local, sin acceso a Supabase. Ver #31 para el residuo y
#10 para el futuro de este backend.

- El usuario `admin` local se crea con permisos hardcodeados en `src/backend/bd.js`.
- Las contraseñas locales se guardan y comparan con bcrypt (`bcryptjs` + `src/backend/password.js`);
  las filas legacy en texto plano se migran de forma transparente en el primer login exitoso
  (`KNOWN_ISSUES.md` #2, resuelto el 14 sep 2026).
- No está confirmado si estos permisos locales se sincronizan de alguna forma con los roles/permisos
  de Supabase descritos arriba, o si son dos fuentes de verdad completamente independientes.

**Acción pendiente (ver `KNOWN_ISSUES.md` #10):** decidir si el sistema local de SQLite debe
eliminarse en favor de Supabase Auth + RLS (que ya es funcional y más completo), o si tiene una
razón de ser (ej. login offline sin conexión a internet) que justifique mantenerlo sincronizado
manualmente.

---

## Cómo usar este documento

- Antes de agregar un permiso nuevo, revisar si ya existe uno equivalente en la tabla `permissions`.
- Al agregar un permiso nuevo, documentarlo aquí en la tabla de "Permisos existentes" y actualizar
  la matriz rol × permiso.
- Si se crea un rol nuevo (ej. `gerente`), documentarlo aquí junto con su matriz de permisos.
- Este documento debe regenerarse periódicamente contra la base real. Las queries de introspección
  con las que se levantó la primera vez se ejecutaron de forma ad-hoc contra el proyecto remoto y
  **no están versionadas en el repo** (no existe `supabase_followup_*.sql`); si se vuelve a
  regenerar, conviene versionar el script de introspección junto a este documento.
