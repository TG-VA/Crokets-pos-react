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

- **Target:** Windows, instalador NSIS (`"target": "nsis"`)
- **App ID:** `com.crokets.pos`
- **Nombre del producto:** "POS CROKETS"
- **Ícono:** `icon.ico` (en la raíz del repo)
- **Instalador NSIS configurado con:**
  - `oneClick: false` — el usuario puede elegir carpeta de instalación
  - `allowToChangeInstallationDirectory: true`
  - Crea acceso directo en escritorio y en el menú inicio
- **Firma deshabilitada:** `signAndEditExecutable: false`. El instalador saldrá sin firmar, por lo
  que Windows SmartScreen puede mostrar una advertencia al usuario. Documentar/aceptar ese aviso o
  configurar firma de código antes de distribución masiva.
- **Solo Windows:** no hay target para macOS/Linux configurado.

El instalador se genera típicamente en una carpeta `dist/` o `release/` (según la versión de
electron-builder).

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

Para iterar solo el frontend o solo el empaquetado existen `npm run build:frontend` y
`npm run build:electron`.

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
