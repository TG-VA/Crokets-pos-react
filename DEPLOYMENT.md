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
- **Publicación (`publish`):** `provider: github`, `owner: TG-VA`, `repo: Crokets-pos-react`,
  `private: true`. Con esta configuración electron-builder genera en `dist/` el descriptor
  `latest.yml` (con el hash SHA-512 del instalador) además del `.exe` y su `.blockmap`, que son los
  artefactos que consumen las auto-actualizaciones.

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
  `npm run build:electron` y subida de `dist/*.exe`, `dist/*.blockmap` y `dist/latest.yml` como
  artefacto (retención: 14 días).
- **Permisos:** `contents: write` para poder crear el Release con el `GITHUB_TOKEN` del repo.
- **Artefactos del Release:** además del instalador, el Release de un tag `v*` adjunta los mapas
  `*.blockmap` y `latest.yml`. Los tres son obligatorios para que `electron-updater` pueda detectar y
  descargar la actualización (ver "Ciclo de Vida de Actualizaciones Automáticas").

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

## Ciclo de Vida de Actualizaciones Automáticas

Las terminales de producción se actualizan solas en segundo plano con `electron-updater` contra los
GitHub Releases del repositorio (`TG-VA/Crokets-pos-react`). No hay que reinstalar a mano en cada
sucursal ni configurar variables de entorno en las máquinas de los clientes.

### Cómo funciona

- **Feed público sin token:** el repositorio `TG-VA/Crokets-pos-react` es público, por lo que
  `electron-updater` consulta GitHub Releases con el provider público y sin autenticación. El
  instalador no embebe ningún token (se retiró el antiguo `GH_READ_TOKEN`, que quedaba expuesto en
  cada `.exe` publicado). `electron/updaterPublishConfig.test.js` falla si `build.publish` vuelve a
  declarar `private` o `token`.
- **Terminales con instaladores anteriores:** las versiones publicadas con el paso "Inject embedded
  updater read token" de `release-windows.yml` conservan `private: true` y el token embebido. Al
  revocar el token, esas terminales reciben 401 al consultar el feed y dejan de actualizarse sin
  aviso en la UI: hay que reinstalarlas a mano con el instalador actual. Estado de la revocación del
  token classic "Crokets POS Auto Updater" y del secreto `GH_READ_TOKEN`: pendiente (anotar aquí la
  fecha cuando ocurra).
- **Convención de nombres de artefacto (`artifactName`):** en `package.json`, la sección `build.nsis`
  define `"artifactName": "POS-CROKETS-Setup-${version}.${ext}"`. Es indispensable que el nombre no
  contenga espacios: al subir artefactos a GitHub Releases, la API de GitHub reemplaza automáticamente los
  espacios por puntos (`POS.CROKETS.Setup.X.X.X.exe`), mientras que el descriptor `latest.yml` genera
  nombres con guiones (`POS-CROKETS-Setup-X.X.X.exe`). Al usar guiones directos en el `artifactName`, el
  nombre subido a GitHub coincide de forma exacta con el de `latest.yml`, evitando el fallo
  `ERR_UPDATER_ASSET_NOT_FOUND` al resolver archivos en `PrivateGitHubProvider`.
- **Servicio del proceso principal** (`electron/updaterService.js`, inicializado desde
  `electron/main.js` tras crear la ventana): configura `autoDownload = true`,
  `autoInstallOnAppQuit = true` y `allowPrerelease = false`. Diez segundos después del arranque
  (`INITIAL_CHECK_DELAY_MS`) dispara una consulta silenciosa a GitHub Releases, de modo que no
  compite con la carga inicial de ventas. En desarrollo (`isDev`) no consulta ni descarga nada.
- **Descarga desatendida:** si el Release tiene una versión mayor que la instalada, el `.exe`
  diferencial (`.blockmap`) se descarga automáticamente en segundo plano. El cajero no ve interrupciones
  ni diálogos del sistema; la app sigue operable durante todo el proceso.
- **Aviso discreto y reinicio:** al completarse la descarga, el proceso principal notifica al renderer
  vía IPC (`update-status`) y `src/components/Footer/Footer.jsx` muestra el botón verde
  `Actualización vX.X.X lista (Reiniciar)` en la esquina inferior izquierda, junto al indicador de versión.
  Al hacer clic en el botón, o al cerrar la app (`autoInstallOnAppQuit`), la actualización se aplica en
  segundos y el POS reinicia con la nueva versión.
- **Datos locales preservados:** el `device_code`, la sesión de caja y la configuración de `electron-store`
  residen fuera del bundle de la aplicación (en `%APPDATA%`), por lo que persisten íntegramente tras
  cada actualización.

### Canales IPC

`electron/preload.js` expone, dentro de su lista blanca, `get-app-version`, `check-for-updates`,
`get-update-status` y `quit-and-install-update`, más el listener push `update-status`. El hook
`src/hooks/useAppUpdater.js` consume ese contrato y degrada a sondeo periódico si el preload no
expone listener.

### Cómo publicar una actualización

```bash
# 1. Incrementar versión en package.json (ej. 1.0.5) sin crear tag git automático
npm version patch --no-git-tag-version

# 2. Hacer commit en main
git commit -am "chore(release): bump version to 1.0.5"

# 3. Crear el tag correspondiente a la nueva versión
git tag v1.0.5

# 4. Enviar los cambios y el tag al repositorio remoto
git push origin main --tags
```

El tag dispara el workflow `Release Windows Installer` (`.github/workflows/release-windows.yml`), que:

1. Compila el instalador NSIS (`dist/POS-CROKETS-Setup-X.X.X.exe`), el mapa `.blockmap` y `dist/latest.yml`.
2. Publica automáticamente el Release en GitHub con los tres artefactos adjuntos.

Las terminales de producción detectarán la nueva versión en el siguiente arranque (10 segundos después de
abrir la aplicación) y descargarán la actualización de forma desatendida. Un `workflow_dispatch` manual
**no** publica Release ni `latest.yml` en Releases: solo deja el artefacto descargable del workflow, por lo
que no alimenta el auto-updater.

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
- **Preload** (`electron/preload.js`): expone `invoke` (con la lista blanca de canales realmente
  registrados en el proceso principal) y un `on` restringido a los canales push permitidos
  (`update-status`); se eliminaron `send` y los canales sin handler.
- **Auto-actualizaciones** (`electron/updaterService.js`): consulta el feed público de GitHub
  Releases sin token (ver "Ciclo de Vida de Actualizaciones Automáticas").

## Datos y respaldo

Los datos de negocio viven en **Supabase Postgres** (todo el stack de datos es remoto desde la
eliminación del backend SQLite local, `KNOWN_ISSUES.md` #31). Antes de una actualización mayor o
migración:

- Generar un respaldo del proyecto Supabase (dashboard o `pg_dump` / `supabase db dump`).
- Las migraciones se aplican con `supabase db push` (ver `docs/SUPABASE_MIGRATIONS.md`); no hay
  rollback automático, por lo que el respaldo es la red de seguridad.
- **Nunca** commitear respaldos ni archivos `.sqlite`/`.env` (ver `.gitignore`).

### Auto-updater desatendido

Los clientes de Windows no necesitan configurar variables de entorno ni tokens: como el repositorio es público, `electron-updater` descarga las actualizaciones de GitHub Releases sin autenticación. No volver a embeber tokens en el instalador: cualquier credencial dentro del `.exe` es extraíble por quien lo descargue.
