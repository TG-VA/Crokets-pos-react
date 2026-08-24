### DEPLOYMENT.md — Build y distribución
Cómo generar el instalador de escritorio de Crokets-POS y qué falta resolver antes de distribuirlo a un negocio real.

#### Antes de empezar: bloqueante conocido
**Leer primero** **KNOWN_ISSUES.md**, punto 1. El backend Express local (`src/backend/server.js`, usado para login) no se inicia automáticamente cuando la app corre empaquetada, y el archivo ni siquiera está incluido en el build. Hasta que esto se resuelva, un instalador generado con `npm run build` probablemente **no permite iniciar sesión**. Verificarlo antes de distribuir cualquier build a un cliente.

Según la configuración build en `package.json`:
* **Target:** Windows, instalador NSIS (`"target": "nsis"`)
* **App ID:** `com.crokets.pos`
* **Nombre del producto:** "POS CROKETS"
* **Ícono:** `icon.ico` (en la raíz del repo)
* **Instalador NSIS configurado con:**
  * `oneClick: false` — el usuario puede elegir carpeta de instalación
  * `allowToChangeInstallationDirectory: true`
  * Crea acceso directo en escritorio y en el menú inicio
El instalador se genera típicamente en una carpeta `dist/` o `release/` (según la versión de electron-builder).
