# ENV_VARIABLES.md — Variables de entorno

Este documento lista **los nombres** de las variables de entorno que el proyecto lee. Los valores
viven en un archivo `.env` en la raíz del repo que **no se commitea** (ver `.gitignore`) y que ningún
agente o colaborador debe abrir, copiar ni imprimir.

## Frontend (Vite)

Las variables con prefijo `VITE_` se **inyectan en el bundle del frontend** y por lo tanto son
públicas para cualquiera que inspeccione la app empaquetada. Nunca poner aquí credenciales
privilegiadas.

| Variable | Requerida | Uso | Referencia |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Sí | URL del proyecto Supabase | `src/lib/supabaseClient.js:3` |
| `VITE_SUPABASE_ANON_KEY` | Sí | Anon key pública de Supabase | `src/lib/supabaseClient.js:4` |
| `VITE_INVENTORY_MOVEMENTS_TABLE` | No | Fuerza el nombre de la tabla de movimientos de inventario (si no se define, se autodetecta entre candidatos) | `src/utils/inventoryMovements.js:20` |

## Backend Node (Express local)

Tras migrar los flujos de dispositivo y caja a RPCs de Supabase (14 sep 2026), `src/backend/server.js`
quedó como login/usuario legacy sobre SQLite y **ya no lee ninguna variable de entorno** (tampoco
`SUPABASE_URL` ni la service-role key). Solo arranca en desarrollo (ver `KNOWN_ISSUES.md` #1 y #31).

## Reglas de seguridad

- **Nunca commitear** el archivo `.env` ni valores de estas variables en código, docs, commits o logs.
- **`SUPABASE_SERVICE_ROLE_KEY` es la credencial más sensible del proyecto**: omite RLS por completo.
  Tras eliminar las rutas de dispositivo/caja del backend local (14 sep 2026), solo la usan las Edge
  Functions (la inyecta el runtime de Supabase). No debe exponerse con prefijo `VITE_`, ni incluirse
  en `dist/` ni en el instalador de Electron.
- La `anon key` (`VITE_SUPABASE_ANON_KEY`) es pública por diseño; la protección real de los datos
  depende de RLS (ver `PERMISSIONS.md` y `KNOWN_ISSUES.md` #13).
- Las credenciales del PAC de facturación (`cfdi_settings.api_username` / `api_password` /
  `api_token`) se guardan en la base de datos, no en `.env`; tratarlas como secretos y no
  exponerlas en el frontend ni en logs.
