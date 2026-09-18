# EDGE_FUNCTIONS.md — Funciones edge de Supabase

Las edge functions viven en `supabase/functions/` y se configuran en `supabase/config.toml`.
Deploy: `supabase functions deploy <nombre>`.

## `authorize-admin-action`

**Propósito:** validar del lado servidor las credenciales de un administrador antes de permitir una
acción protegida (p. ej. entrar a una sección restringida o ejecutar una operación sensible). La UI
la consume a través de `src/lib/adminAuthorizationService.js` (modal `AdminAuthorizationModal`).

**Implementación:** `supabase/functions/authorize-admin-action/index.ts` (Deno).

### Contrato

`POST` (la app lo invoca con `supabase.functions.invoke`).

Request body:

| Campo | Requerido | Descripción |
|---|---|---|
| `username` | Sí | Username del administrador |
| `password` | Sí | Contraseña del administrador |
| `action` | Sí | Acción que se pretende autorizar |
| `targetId` | No | Identificador del objetivo de la acción |
| `branchId` | No | Sucursal sobre la que aplica |

Response (éxito, HTTP 200):

```json
{
  "ok": true,
  "authorizedBy": "<uuid>",
  "authorizedByUsername": "<username>",
  "action": "<accion>",
  "targetId": "<uuid|null>",
  "branchId": "<uuid|null>"
}
```

Response (fallo): `{ "ok": false, "message": "<motivo>" }` (HTTP 200 o 500 según el caso; 405 si el
método no es `POST`).

### Flujo de validación

1. Busca el usuario por `username` en `public.users` con un cliente **service role**
   (`index.ts:96-108`).
2. Verifica que el usuario exista, esté activo y tenga rol `admin` (`index.ts:122-145`).
3. Inicia sesión contra **Supabase Auth** con el email del usuario y la contraseña recibida, usando
   un cliente **anon** (`index.ts:154-165`).
4. Confirma que el `id` autenticado coincide con el usuario administrador y cierra la sesión local
   (`index.ts:167-176`).

### Seguridad

- **`verify_jwt = false`** (`supabase/config.toml:4`) es intencional y aceptable: la función no
  confía en el JWT del llamador; **re-autentica al administrador con su contraseña** contra Supabase
  Auth. Es un endpoint de autorización, no un endpoint autenticado por sesión.
- Usa `SUPABASE_SERVICE_ROLE_KEY` internamente (provista por el runtime de Supabase, solo en el
  servidor) para leer `public.users`; la clave nunca se expone al cliente.
- CORS abierto (`Access-Control-Allow-Origin: *`) y respuestas de error genéricas para no filtrar
  si un usuario existe o no. Nota: algunos mensajes distinguen usuario inexistente, inactivo o sin
  rol admin — revisar si se quiere endurecer contra enumeración.
- No confundir este flujo con el login normal de la app (`AuthContext` + Supabase Auth) ni con el
  login del backend Express local (ver `KNOWN_ISSUES.md` #1 y #2).

### Auditoría SEC-3 (KNOWN_ISSUES #38, 17 sep 2026)

Hallazgos de la revisión de que el gateo administrativo no viva solo en el cliente:

1. **La autorización no está ligada a la mutación.** `authorize-admin-action` solo re-autentica al
   admin y devuelve `ok`; no emite token ni ejecuta la acción. La operación posterior la realiza la
   **sesión del usuario que está operando** (p. ej. el cajero) contra RLS/RPC, que hoy no exigen
   `is_admin()` para las acciones gateadas (`cash_exit_access` → `cash_movements`; `customers_deactivate`
   → `customers`; `deactivate_fiscal_customer` → `customers`). Un usuario autenticado puede saltarse
   el modal e invocar la RPC/PostgREST directamente.
2. **`reason` no existe en el contrato.** `AdminAuthorizationModal` envía `reason`
   (`AdminAuthorizationModal.jsx:72`) pero `adminAuthorizationService.authorizeAdminAction` no lo
   acepta y la función `index.ts` no lo lee ni lo persiste. El motivo requerido se descarta.
3. **`action`/`targetId`/`branchId` no se validan.** El servidor autoriza cualquier string de
   `action`; no hay allowlist contra `adminProtectedSections.js` ni registro de auditoría de la
   autorización.
4. **`action` de navegación ≠ acción sensible.** Las acciones `*_access` (reports/products/invoices)
   solo protegen la navegación de UI; no corresponden a una mutación de datos específica, por lo que
   no hay un "endpoint" server-side que validar en esos casos.

**Mitigación aplicada (17 sep 2026, `20260917200000_harden_transactional_rpcs.sql`):** se endurecieron
las RPCs transaccionales revocando `EXECUTE` a `anon`/`PUBLIC` y fijando `p_user_id := coalesce(auth.uid(),
p_user_id)`, lo que cierra el acceso anónimo y la suplantación de actor en ventas, cancelaciones,
traspasos y devoluciones.

**Decisión #10/#13 (17 sep 2026, opción "hardening sin habilitar RLS"):** **no** se habilita RLS ni se
exige `is_admin()` server-side en las mutaciones administrativas (catálogo, bajas de clientes, retiros de
caja) porque el modelo actual es `authenticated` de confianza y activar RLS sobre ~37 tablas sin
políticas rompería el acceso. Se documenta como **riesgo aceptado** en `PERMISSIONS.md`. `reason`,
`action` y `targetId` siguen sin validarse ni auditarse en la edge function.

**Recomendación futura:** si se requiere separación real admin vs cajero, emitir desde la edge function
un token de un solo uso/registro de auditoría ligado a `authorizedBy` + `action` + `targetId` que la
mutación consuma, y habilitar RLS por módulo con `has_permission()`. Ver el informe en `PR_REVIEW.md`.
