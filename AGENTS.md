# AGENTS.md

Guía para agentes de IA (Claude Code, Cursor, Copilot, Gemini, etc.) y desarrolladores que trabajen en este repositorio.

## Descripción del proyecto

Crokets-POS es un sistema de punto de venta (POS) de escritorio para establecimientos de alimentos para mascotas, construido con Electron + React (Vite) en el frontend y un servidor Express embebido como backend, con SQLite local y Supabase como base de datos/servicios remotos (auth, funciones edge).

## Stack técnico

- **Frontend:** React 19, React Router 7, Vite 7, CSS Modules
- **Escritorio:** Electron 37 (proceso principal en `electron/main.js`, `electron/preload.js`)
- **Backend local:** Express 5, corre en `src/backend/server.js` con Nodemon en dev
- **Base de datos local:** SQLite (`sqlite3`) — archivo en `src/backend/db/`
- **Backend remoto:** Supabase (`@supabase/supabase-js`), funciones edge en `supabase/functions/`
- **Otros:** `exceljs` / `xlsx` para reportes, `react-datepicker`, `electron-store`, `dotenv`

## Convenciones de código y estándares estrictos

- **Componentes funcionales:** Usar componentes funcionales de React con hooks (no clases).
- **Estilos con CSS Modules:** Usar estrictamente CSS Modules (`*.module.css`). Prohibido CSS global nuevo, Tailwind, styled-components o utilidades inline no justificadas.
- **Cero `!important` en CSS:** Evitar el uso de `!important` en los módulos CSS. Resolver conflictos de especificidad o el orden de los selectores.
- **Clases dinámicas limpias:** Al construir `className` dinámicos (ej. `${styles.kpiValue} ${kpi.isText ? styles.kpiValueText : ""}`), asegurar que no queden espacios en blanco colgantes en el DOM.
- **Sin emojis en código ni UI:** Cero emojis en archivos de código, UI, comentarios, mensajes de error o logs. Usar iconos SVG de `src/assets/icons/` según `ICONS.md`.
- **Manejo estricto de Logs y Errores:**
  - Eliminar todos los `console.log` y `console.warn` de depuración antes de commitear.
  - **MANTENER `console.error`:** Los `console.error` dentro de bloques `catch` o manejadores de fallos de Supabase/SQLite **DEBEN MANTENERSE** para trazabilidad en producción (retirando emojis si los tuvieran).
- **Formato de archivos:** Todos los archivos deben finalizar con un salto de línea en blanco (EOF newline).
- **Autenticación y permisos:** Manejados vía `AuthContext`, `permissionsService.js` y `adminAuthorizationService.js`. Respetar este flujo sin reinventar checks de rol.

## Qué evitar

- No commitear `.env`, claves de Supabase, ni archivos `.sqlite`/`.sqlite3` (en `.gitignore`).
- No reemplazar `sqlite3` por otro driver sin ajustar `npm run rebuild`.
- No mezclar convenciones de estilos ni agregar frameworks/librerías de UI no usados en el proyecto.
