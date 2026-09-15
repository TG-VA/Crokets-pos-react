# DEPLOYMENT.md — Build y distribución

Cómo generar el instalador de escritorio de Crokets-POS y qué falta resolver antes de distribuirlo
a un negocio real.

## Estado del backend local

**Resuelto el 14 sep 2026** (`KNOWN_ISSUES.md` #1, rama `fix/production-backend`). El frontend ya
no depende del servidor Express local: la resolución de sucursal por dispositivo y las operaciones
de caja se ejecutan con RPCs de Supabase (`get_branch_by_device`, `get_cash_register_session`,
`open_cash_register`). El instalador no necesita iniciar `src/backend/server.js`, ni empaquetar la
`SUPABASE_SERVICE_ROLE_KEY`, ni resolver el ABI de `sqlite3` contra Electron. En la misma fecha se
eliminaron además los endpoints `/device/branch` y `/cash/*` del backend local, su helper y el
cliente con service-role key, junto con los handlers IPC legacy (`login`, `set-initial-cash`,
`check-cash-register`, `close-cash-register`). `src/backend/` se conserva solo como login legacy por
SQLite (ya no consumido por el frontend) para desarrollo local.

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

El proyecto usa `sqlite3` (módulo nativo). Tras instalar dependencias o cambiar la versión de
Electron/Node, hay que reconstruir el binario contra el runtime de Electron:

```bash
npm run rebuild   # electron-rebuild -f -w sqlite3
```

Si no se hace, el login local (que depende de SQLite) fallará al abrir la app empaquetada. Desde el
14 sep 2026 el instalador ya no carga `sqlite3` (el login de producción usa Supabase Auth), por lo
que `npm run rebuild` no es necesario para distribuir; solo aplica al backend de desarrollo
(`npm run dev` corre bajo el Node del sistema).

## Flujo de build

```bash
# 1. Instalar dependencias
npm install

# 2. (si cambió Electron/Node) reconstruir módulo nativo
npm run rebuild

# 3. Correr los tests
npm test

# 4. Generar el instalador completo (frontend + electron-builder)
npm run build
```

Para iterar solo el frontend o solo el empaquetado existen `npm run build:frontend` y
`npm run build:electron`.

## Checklist antes de distribuir a un cliente

- [x] El bloqueante de login (#1) está verificado/resuelto (frontend sin dependencia del server local).
- [x] La contraseña del admin local ya no está en texto plano (#2: `bcryptjs` + migración en login).
- [x] CSP estricta inyectada en el build de producción y Electron endurecido (ventanas/navegación), 14 sep 2026.
- [ ] `npm test` pasa.
- [ ] `npm run rebuild` ejecutado si cambió Electron/Node.
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

Los datos de negocio viven en **Supabase Postgres** (el SQLite local solo guarda el login local).
Antes de una actualización mayor o migración:

- Generar un respaldo del proyecto Supabase (dashboard o `pg_dump` / `supabase db dump`).
- Las migraciones se aplican con `supabase db push` (ver `docs/SUPABASE_MIGRATIONS.md`); no hay
  rollback automático, por lo que el respaldo es la red de seguridad.
- **Nunca** commitear respaldos ni archivos `.sqlite`/`.env` (ver `.gitignore`).
