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

| Rol | Estado |
|---|---|
| `admin` | activo |
| `cajero` | activo |

No existe un rol `gerente` todavía, a diferencia de lo que sugería la versión anterior de este
documento — si se necesita, hay que crearlo explícitamente en `roles` y asignarle permisos en
`role_permissions`.

### Permisos existentes

| Permiso | Habilita (según su uso en RLS) |
|---|---|
| `can_manage_inventory` | Insertar/editar/eliminar en `branch_inventory` |
| `can_view_branch` | Consultar `branch_inventory` |

### Matriz rol × permiso (real, no aspiracional)

| | `can_manage_inventory` | `can_view_branch` |
|---|---|---|
| **admin** | ✔ | ✔ |
| **cajero** | ✔ | ✔ |

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

| Email | Rol | Activo |
|---|---|---|
| carlos@internal.crokets | admin | sí |
| tristan@internal.crokets | admin | sí |
| kari@internal.crokets | cajero | sí |
| alexander@example.com | cajero | sí |

> `alexander@example.com` no sigue la convención `@internal.crokets` de los demás usuarios —
> confirmar si es una cuenta de prueba que debería eliminarse antes de producción.

### Otras tablas relacionadas

- **`user_branches`** — controla a qué sucursales tiene acceso cada usuario, independientemente de
  su rol. Tiene su propio campo `access_level` (default `'view'`) y su propia política RLS
  (`user_branches_admin_write`, que usa `is_admin()` directamente en vez de `has_permission()`).
  Esto es un segundo nivel de control: rol (qué puede hacer) + sucursal (dónde puede hacerlo).

---

## 2. Sistema local — SQLite embebido (`src/backend/bd.js`)

Este es el sistema que usa el backend Express local para el login, **independiente de Supabase
Auth**. Ver `KNOWN_ISSUES.md` puntos 1 y 2 para el estado de este backend (no arranca en producción
empaquetada; el usuario admin se crea con contraseña en texto plano).

- El usuario `admin` local se crea con permisos hardcodeados en `src/backend/bd.js`.
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
- Este documento debe regenerarse periódicamente contra la base real — ver
  `supabase_followup_2.sql` / `supabase_followup_3.sql` para las queries usadas para levantarlo la
  primera vez.
