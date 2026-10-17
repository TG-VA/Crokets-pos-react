# ENV_VARIABLES.md — Variables de entorno

Este documento lista **los nombres** de las variables de entorno que el proyecto lee. Los valores
viven en un archivo `.env` en la raíz del repo que **no se commitea** (ver `.gitignore`) y que ningún
agente o colaborador debe abrir, copiar ni imprimir.

## Frontend (Vite)

Las variables con prefijo `VITE_` se **inyectan en el bundle del frontend** y por lo tanto son
públicas para cualquiera que inspeccione la app empaquetada. Nunca poner aquí credenciales
privilegiadas.

| Variable                         | Requerida | Uso                                                                                                          | Referencia                           |
| -------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| `VITE_SUPABASE_URL`              | Sí        | URL del proyecto Supabase                                                                                    | `src/lib/supabaseClient.js:3`        |
| `VITE_SUPABASE_ANON_KEY`         | Sí        | Anon key pública de Supabase                                                                                 | `src/lib/supabaseClient.js:4`        |
| `VITE_INVENTORY_MOVEMENTS_TABLE` | No        | Fuerza el nombre de la tabla de movimientos de inventario (si no se define, se autodetecta entre candidatos) | `src/utils/inventoryMovements.js:20` |

## Secretos de GitHub Actions (build del instalador)

El workflow `.github/workflows/release-windows.yml` compila el frontend en CI con los mismos
nombres de variable. Se configuran en
`Settings -> Secrets and variables -> Actions` del repositorio de GitHub:

| Secreto                  | Corresponde a            | Valor                                      |
| ------------------------ | ------------------------ | ------------------------------------------ |
| `VITE_SUPABASE_URL`      | `VITE_SUPABASE_URL`      | URL del proyecto de producción de Supabase |
| `VITE_SUPABASE_ANON_KEY` | `VITE_SUPABASE_ANON_KEY` | Anon key pública de producción de Supabase |

Son los valores que el paso `Build frontend` inyecta en el entorno antes de `npm run build:frontend`.
Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` como secreto con prefijo `VITE_`. Ver `DEPLOYMENT.md`
(sección "Release automático con GitHub Actions") para el flujo completo de generación del `.exe`.

## Proceso principal de Electron (auto-updater)

Se leen en tiempo de ejecución desde el proceso principal (`electron/updaterService.js`), **no** se
inyectan en el bundle del renderer. Nunca usar prefijo `VITE_` con estas variables.

| Variable                | Requerida | Uso                                                                                                                              | Referencia                             |
| ----------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `GH_TOKEN`              | No        | Token de lectura del feed privado de GitHub Releases; lo consume el provider de GitHub de `electron-updater` con `private: true` | `electron-updater` (`providerFactory`) |
| `GITHUB_TOKEN`          | No        | Alternativa a `GH_TOKEN`                                                                                                         | `electron-updater` (`providerFactory`) |
| `CROKETS_GH_READ_TOKEN` | No        | Token de lectura dedicado que se envía como header `Authorization` del feed                                                      | `electron/updaterService.js:20`        |

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

### GH_READ_TOKEN (secreto de GitHub Actions)

Para facilitar las actualizaciones desatendidas en repositorios privados, el workflow de release inyecta un token de solo lectura embebido en el instalador de Windows (`.exe`).

| Secreto         | Uso                                                                                                           | Notas                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `GH_READ_TOKEN` | Token Personal Access Token con permiso `Contents: Read-only` sobre el repositorio `TG-VA/Crokets-pos-react`. | Se inyecta como `ghReadToken` en `electron/updaterConfig.json` durante el build en CI y nunca se commitea. |

**Jerarquía de resolución (auto-updater):**

1. **Variable de entorno del sistema** (`CROKETS_GH_READ_TOKEN` o `GH_TOKEN`) — tiene prioridad más alta. Útil para desarrollo/pruebas locales o despliegues custom.
2. **Token embebido** (`electron/updaterConfig.json`, campo `ghReadToken`) — generado automáticamente por CI en el paso "Inject embedded updater read token". Permite que el instalador `.exe` funcione sin configuración manual en Windows.
3. **Sin token** (`null`) — el updater intentará consultar sin autenticación (solo válido si el repo fuera público o el feed no requiriera auth).
