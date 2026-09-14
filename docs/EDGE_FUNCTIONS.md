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
