# DEPLOYMENT.md — Build y distribución

Cómo generar el instalador de escritorio de Crokets-POS y qué falta resolver antes de distribuirlo
a un negocio real.

## Bloqueante conocido

**Leer primero `KNOWN_ISSUES.md`, punto 1.** El backend Express local (`src/backend/server.js`,
usado para login) no se inicia automáticamente cuando la app corre empaquetada, y el archivo ni
siquiera está incluido en el build. Hasta que esto se resuelva, un instalador generado con
`npm run build` probablemente **no permite iniciar sesión**. Verificarlo antes de distribuir
cualquier build a un cliente.

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

Si no se hace, el login local (que depende de SQLite) fallará al abrir la app empaquetada.

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

- [ ] El bloqueante de login (#1) está verificado/resuelto en un build empaquetado.
- [ ] La contraseña del admin local ya no está en texto plano (#2) o se aceptó el riesgo de forma explícita.
- [ ] `npm test` pasa.
- [ ] `npm run rebuild` ejecutado si cambió Electron/Node.
- [ ] Versión (`package.json`) incrementada.
- [ ] Cuenta de prueba `alexander@example.com` desactivada/eliminada (#14).
- [ ] RLS/roles revisados (#13) o riesgo aceptado.
- [ ] Respaldo de la base de datos Supabase vigente (ver abajo).

## Datos y respaldo

Los datos de negocio viven en **Supabase Postgres** (el SQLite local solo guarda el login local).
Antes de una actualización mayor o migración:

- Generar un respaldo del proyecto Supabase (dashboard o `pg_dump` / `supabase db dump`).
- Las migraciones se aplican con `supabase db push` (ver `docs/SUPABASE_MIGRATIONS.md`); no hay
  rollback automático, por lo que el respaldo es la red de seguridad.
- **Nunca** commitear respaldos ni archivos `.sqlite`/`.env` (ver `.gitignore`).
