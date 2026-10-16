# DEPLOYMENT.md — Build y distribución

Cómo generar el instalador de escritorio de Crokets-POS y qué falta resolver antes de distribuirlo
a un negocio real.

## Estado del backend local

**Eliminado el 18 sep 2026** (cierre de `KNOWN_ISSUES.md` #1/#10/#31). El frontend no depende de
ningún servidor local: la resolución de sucursal por dispositivo y las operaciones de caja se ejecutan
con RPCs de Supabase (`get_branch_by_device`, `get_cash_register_session`, `open_cash_register`), y
el login usa Supabase Auth. `src/backend/` (server Express, SQLite, `password.js`, `users.db`) se
eliminó por completo, junto con los handlers IPC legacy (`login`, `set-initial-cash`,
`check-cash-register`, `close-cash-register`). El instalador no necesita iniciar servidor alguno ni
empaquetar la `SUPABASE_SERVICE_ROLE_KEY`, ni resolver el ABI de `sqlite3` contra Electron (ver
`KNOWN_ISSUES.md` #31).

## Configuración del build

Según la configuración `build` en `package.json`:

- **Target:** Windows 64 bits, instalador NSIS (`{"target": "nsis", "arch": ["x64"]}`)
- **App ID:** `com.crokets.pos`
- **Nombre del producto:** "POS CROKETS"
- **Ícono:** `icon.ico` (en la raíz del repo)
- **Archivos empaquetados (`files`):** solo `dist/**/*`, `electron/**/*`, `icon.ico` y
  `package.json`. **No** se incluye `node_modules/**/*`: electron-builder resuelve y empaqueta
  automáticamente las dependencias de producción declaradas en `dependencies` (React, Supabase,
  ExcelJS, etc.), excluyendo las `devDependencies` (Vite, Vitest, ESLint). Esto evita inflar el
  instalador con la cadena de desarrollo.
- **Instalador NSIS configurado con:**
  - `oneClick: false` — el usuario puede elegir carpeta de instalación
  - `allowToChangeInstallationDirectory: true`
  - Crea acceso directo en escritorio y en el menú inicio
  - `shortcutName: "POS CROKETS"` — nombre explícito de los accesos directos
  - `installerIcon` / `uninstallerIcon` fijados a `icon.ico`
- **Firma deshabilitada:** `signAndEditExecutable: false`. El instalador saldrá sin firmar, por lo
  que Windows SmartScreen puede mostrar una advertencia al usuario. Documentar/aceptar ese aviso o
  configurar firma de código antes de distribución masiva.
- **Solo Windows:** no hay target para macOS/Linux configurado.

El instalador se genera típicamente en una carpeta `dist/` o `release/` (según la versión de
electron-builder).

## Variables de entorno en el build

Vite **inyecta estáticamente** las variables con prefijo `VITE_` en el bundle durante
`npm run build:frontend`. No se leen en tiempo de ejecución: el valor que quede en `dist/` es el que
estaba presente al compilar.

- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` son las únicas variables que el bundle de producción
  necesita (ver `docs/ENV_VARIABLES.md`). Deben estar definidas en el entorno (o en `.env`) **antes**
  de correr `npm run build:frontend`.
- La clave `anon` es pública por diseño (protegida por RLS); **nunca** debe exponerse
  `SUPABASE_SERVICE_ROLE_KEY` con prefijo `VITE_` ni incluirse en `dist/`/el instalador.
- Como los valores se congelan en el bundle, cambiar de proyecto Supabase (u otra URL/clave) exige
  **recompilar** el frontend y **re-empaquetar** el instalador; desplegar un nuevo `.env` junto al
  `.exe` no tiene efecto.

## Módulos nativos

No quedan módulos nativos tras la eliminación del backend local SQLite (`KNOWN_ISSUES.md` #31): la
dependencia `sqlite3` y el script `npm run rebuild` (`electron-rebuild`) se retiraron de
`package.json`. No hay binarios que reconstruir contra el runtime de Electron en el flujo normal.

## Flujo de build

```bash
# 1. Instalar dependencias
npm install

# 2. Correr los tests
npm test

# 3. Generar el instalador completo (frontend + electron-builder)
npm run build
```

Los pasos 2 y 3 se pueden separar para iterar solo el frontend o solo el empaquetado:

```bash
# Compila React con las variables de producción inyectadas en dist/
npm run build:frontend

# Genera el instalador NSIS .exe (x64) a partir del dist/ ya compilado
npm run build:electron
```

`build:electron` **no** recompila el frontend: reutiliza el `dist/` existente, por lo que hay que
correr `build:frontend` primero (con las variables de producción presentes) antes de empaquetar.

## Release automático con GitHub Actions (Windows)

El workflow `.github/workflows/release-windows.yml` ("Release Windows Installer") compila el
instalador NSIS en `windows-latest` y publica el `.exe`:

- **Disparadores:**
  - `push` de tags `v*` (ej. `v1.0.0`): además crea un GitHub Release con el instalador adjunto y
    notas de versión generadas.
  - `workflow_dispatch`: compilación manual desde la pestaña Actions de GitHub, sin crear tag
    (útil para probar). El `.exe` queda como artefacto descargable del workflow.
- **Pasos del job `build-windows`:** checkout completo, Node 22 con caché de npm, `npm ci`,
  `npm test`, `npm run build:frontend` (con los secretos de producción inyectados),
  `npm run build:electron` y subida del `dist/*.exe` como artefacto (retención: 14 días).
- **Permisos:** `contents: write` para poder crear el Release con el `GITHUB_TOKEN` del repo.

### Secretos requeridos en GitHub

Configurar en `Settings -> Secrets and variables -> Actions` del repositorio:

| Secreto                  | Valor                                          |
| ------------------------ | ---------------------------------------------- |
| `VITE_SUPABASE_URL`      | URL del proyecto de **producción** de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key pública de **producción** de Supabase |

`GITHUB_TOKEN` lo aporta GitHub Actions automáticamente; no requiere configuración. Estos secretos
son los mismos nombres documentados en `docs/ENV_VARIABLES.md` (Vite los inyecta en el bundle en el
paso `Build frontend`).

### Cómo generar un instalador

**Opción A — manual (sin tag):**

1. Ir a la pestaña `Actions` del repositorio en GitHub.
2. Seleccionar `Release Windows Installer` en el panel izquierdo.
3. Pulsar `Run workflow` (requiere que el workflow exista en la rama por defecto) y elegir la rama.
4. Al terminar, descargar el `.exe` desde el artefacto `pos-crokets-windows-installer` de la
   ejecución.

**Opción B — con tag (instalador + GitHub Release):**

```bash
git tag v1.0.0
git push origin v1.0.0
```

La ejecución resultante publica automáticamente un GitHub Release con el instalador adjunto.

## Checklist antes de distribuir a un cliente

- [x] El bloqueante de login (#1) está verificado/resuelto (frontend sin dependencia del server local).
- [x] Backend local eliminado por completo (#31): sin Express/SQLite/`npm run rebuild` en el stack.
- [x] CSP estricta inyectada en el build de producción y Electron endurecido (ventanas/navegación), 14 sep 2026.
- [ ] `npm test` pasa.
- [ ] Versión (`package.json`) incrementada.
- [ ] Cuenta de prueba `alexander@example.com` desactivada/eliminada (#14).
- [ ] RLS/roles revisados (#13) o riesgo aceptado.
- [ ] Instalador empaquetado probado en Windows: carga de assets bajo `file://` (KNOWN_ISSUES #36).
- [ ] Respaldo de la base de datos Supabase vigente (ver abajo).

## Endurecimiento del cliente (14 sep 2026)

- **CSP** (`vite.config.mjs`): se inyecta una `Content-Security-Policy` por `<meta>` solo en el build
  de producción (`default-src 'self'`, `script-src 'self'`, `connect-src` limitado a Supabase). En
  desarrollo no aplica para no romper el HMR.
- **Rutas de assets** (`vite.config.mjs`): `base: './'` para que el build cargue bajo `file://`
  (KNOWN_ISSUES #36).
- **Electron** (`electron/main.js`): `setWindowOpenHandler` deniega ventanas emergentes y
  `will-navigate` bloquea la navegación fuera del origen de la app.
- **Preload** (`electron/preload.js`): solo expone `invoke` con los canales realmente registrados en
  el proceso principal; se eliminaron `send`/`on` y canales sin handler.

## Datos y respaldo

Los datos de negocio viven en **Supabase Postgres** (todo el stack de datos es remoto desde la
eliminación del backend SQLite local, `KNOWN_ISSUES.md` #31). Antes de una actualización mayor o
migración:

- Generar un respaldo del proyecto Supabase (dashboard o `pg_dump` / `supabase db dump`).
- Las migraciones se aplican con `supabase db push` (ver `docs/SUPABASE_MIGRATIONS.md`); no hay
  rollback automático, por lo que el respaldo es la red de seguridad.
- **Nunca** commitear respaldos ni archivos `.sqlite`/`.env` (ver `.gitignore`).
