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

Se cargan con `dotenv` al arrancar `src/backend/server.js` y **solo existen en el proceso Node**;
no llegan al bundle del frontend. Este backend es el del login local y hoy solo arranca en
desarrollo (ver `KNOWN_ISSUES.md` #1).

| Variable | Requerida | Uso | Referencia |
|---|---|---|---|
| `SUPABASE_URL` | Sí | URL del proyecto Supabase para el backend local | `src/backend/server.js:12` |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Clave **privilegiada** (bypassa RLS) para operaciones del backend local | `src/backend/server.js:13` |

## Reglas de seguridad

- **Nunca commitear** el archivo `.env` ni valores de estas variables en código, docs, commits o logs.
- **`SUPABASE_SERVICE_ROLE_KEY` es la credencial más sensible del proyecto**: omite RLS por completo.
  Debe vivir solo en el proceso Node del backend (y en el entorno de Supabase Edge Functions). No
  debe exponerse con prefijo `VITE_`, ni incluirse en `dist/` ni en el instalador de Electron.
- La `anon key` (`VITE_SUPABASE_ANON_KEY`) es pública por diseño; la protección real de los datos
  depende de RLS (ver `PERMISSIONS.md` y `KNOWN_ISSUES.md` #13).
- Las credenciales del PAC de facturación (`cfdi_settings.api_username` / `api_password` /
  `api_token`) se guardan en la base de datos, no en `.env`; tratarlas como secretos y no
  exponerlas en el frontend ni en logs.
