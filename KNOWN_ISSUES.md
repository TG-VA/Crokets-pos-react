# KNOWN_ISSUES.md — Pendientes y deuda técnica conocida

Registro centralizado de problemas identificados en el proyecto. El objetivo es que no queden
como notas sueltas dentro de otros documentos — cualquier pendiente nuevo que se descubra debería
agregarse aquí con su severidad y estado.

Severidad: **Crítico** (bloquea funcionalidad o expone datos) / **Alto** (riesgo real, no urgente)
/ **Medio** (deuda técnica) / **Bajo** (cosmético / conveniencia).

---

## Crítico

### 1. El backend local no arranca en producción
**Estado:** abierto — sin confirmar si ya se resolvió de otra forma no documentada.

`electron/main.js` llama a `http://localhost:3000/login` (y presumiblemente otros endpoints) para
autenticación local, pero ese servidor (`src/backend/server.js`) **solo se inicia en modo
desarrollo**, vía `nodemon` dentro del script `npm run dev`. No hay ningún código en
`electron/main.js` que haga `fork`/`spawn` del servidor cuando la app corre empaquetada.

Además, `src/backend/server.js` **no está incluido** en el arreglo `files` de la configuración de
`electron-builder` en `package.json` (solo incluye `dist/**/*`, `electron/**/*`,
`node_modules/**/*`, `icon.ico`) — aunque se agregara el código para iniciarlo, el archivo no
estaría presente en el instalador.

**Impacto:** el login (y cualquier otra ruta que dependa de este servidor Express local) muy
probablemente no funciona en el `.exe` generado por `npm run build`. Ver `DEPLOYMENT.md` para más
detalle y opciones de solución.

**Antes de distribuir cualquier instalador a un negocio real, esto debe verificarse y corregirse.**

### 2. Contraseña del usuario admin en texto plano
**Estado:** abierto.

En `src/backend/bd.js`, el usuario `admin` local se crea con contraseña `'1234'` sin hash
(`bcrypt` o similar), y se compara presumiblemente en texto plano en el login. Si el archivo
`users.db` o el instalador se distribuyen tal cual, la contraseña es visible para quien acceda al
archivo.

**Recomendación:** hashear contraseñas con `bcrypt` antes de guardar/comparar, y forzar cambio de
contraseña del admin en el primer inicio de sesión.

---

## Alto

### 3. Componentes "dios" (god components) que violan SRP
**Estado:** abierto, documentado en `CODE_STANDARDS.md`.

Varios archivos concentran demasiada responsabilidad (UI + lógica de negocio + llamadas a datos)
en un solo componente:

| Archivo | Líneas | Nota |
|---|---|---|
| `src/pages/CashCut/CashCut.jsx` | ~2020 | 34 `useState`/`useEffect` en un solo componente |
| `src/utils/ticketBuilder.js` | ~1500 | mezcla formato y lógica de negocio |
| `src/components/.../ProductsModify/ProductsModify.jsx` | ~1330 | formulario + validación + datos |
| `src/components/.../ProductsPromotions/ProductsPromotions.jsx` | ~1265 | idem |
| `src/components/.../RewardModal/RewardModal.jsx` | ~1065 | idem |

**Recomendación:** ver la guía de refactor incremental en `CODE_STANDARDS.md` (sección "Cómo
dividir un componente grande"). No requiere reescritura de golpe.

### 4. Emojis pendientes de limpiar en el código fuente
**Estado:** abierto — la documentación (`.md`) ya está limpia; el código de `src/` no.

Más de 20 archivos `.jsx`/`.js` contienen emojis o símbolos Unicode usados como iconos o en logs
de consola. Ejemplos notables:
- `src/pages/Settings/Settings.jsx` — emojis distintos usados como iconos de categoría
- `src/components/SalesComponents/SalesProductsTable/SalesProductsTable.jsx` — indicadores de
  color/estado con emoji
- `src/backend/bd.js` — emojis en mensajes de consola

**Regla del proyecto:** prohibido el uso de emojis en cualquier parte (ver `CODE_STANDARDS.md`,
punto 7). Reemplazar por texto plano o por un icono del catálogo propio en `ICONS.md`
(`src/assets/icons/`) — si no existe uno adecuado, preguntar antes de agregar uno nuevo.

### 5. Transacciones Atómicas (RPC) faltantes en Supabase
**Estado:** abierto — parcialmente resuelto.

Actualmente, módulos críticos como Importación Masiva (`productsImportService.js`) y Promociones/Kits (`productKitsService.js`) utilizan múltiples llamadas HTTP independientes con rollbacks manuales desde el frontend (Transacciones Compensatorias).

**Actualización (24 ago 2026):** se confirmó por introspección directa del schema (ver `SCHEMA.md`)
que **ventas y transferencias entre sucursales ya cuentan con RPC atómica**
(`create_sale_transaction`, `create_transfer_order`, `receive_transfer_order`,
`cancel_transfer_order`, `close_cash_register_session`). No existe todavía ninguna función RPC
equivalente para Importación masiva ni para Kits de Productos — el problema descrito sigue vigente
específicamente para esos dos módulos.

**Impacto:** existe una ventana de riesgo de concurrencia donde un fallo de red puede dejar
registros huérfanos en Importación o Kits, a pesar de los bloques `try/catch`.

**Recomendación:** migrar la lógica de inserción masiva de Importación y Kits a Stored Procedures
(`plpgsql` / RPC) en Supabase, siguiendo el mismo patrón ya usado en `create_sale_transaction` /
`create_transfer_order`.

### 13. Roles de Supabase sin diferenciación real de permisos
**Estado:** abierto — nuevo, detectado el 24 de agosto de 2026 por introspección directa de RLS y
la tabla `role_permissions`.

El sistema de roles en Supabase (`users → roles → role_permissions → permissions`) existe y está
activo en producción, pero actualmente **los roles `admin` y `cajero` tienen exactamente los mismos
permisos** (`can_manage_inventory` y `can_view_branch`, ambos). Además, solo la tabla
`branch_inventory` usa `has_permission()` de verdad en sus políticas RLS; el resto de los módulos
revisados (`sales`, `sale_details`, `sale_payments`, `customers`, `reward_products`,
`sale_reward_redemptions`, entre otros) tienen políticas `USING (true)` — es decir, cualquier
usuario autenticado, sin importar su rol, puede leer/escribir en esas tablas sin ninguna
restricción granular.

**Impacto:** un usuario con rol `cajero` tiene, en la práctica, el mismo nivel de acceso a la base
de datos que un `admin`, salvo en el módulo de inventario. Esto puede ser una decisión consciente
del equipo en esta etapa del proyecto, pero si no lo es, representa una superficie de riesgo real
(ej. un cajero podría cancelar facturas o alterar el catálogo de productos vía API/RLS aunque la UI
se lo oculte).

**Recomendación:** confirmar con el equipo si esto es intencional. Si no lo es, definir la matriz
de permisos deseada por rol y implementarla en `role_permissions`, y extender el uso de
`has_permission()` en las políticas RLS de los módulos sensibles (facturación, cancelaciones,
catálogo de productos). Ver detalle completo en `PERMISSIONS.md`.

---

## Medio

### 6. Sin migraciones SQL versionadas para Supabase
**Estado:** abierto.

El schema completo de las tablas remotas (ver `docs/SCHEMA.md`) vive únicamente en el proyecto de
Supabase (dashboard remoto). No hay carpeta `supabase/migrations/` en el repo, por lo que no hay
forma de recrear el schema desde cero solo con este repositorio, ni de rastrear cambios de
estructura en el historial de git.

**Actualización (24 ago 2026):** se generó un inventario manual completo del schema por
introspección directa — ver `SCHEMA.md`. Esto mitiga parcialmente el problema (ya hay una
referencia versionada en Git), pero no sustituye migraciones reales ejecutables.

**Recomendación:** adoptar `supabase db dump` / migraciones versionadas si el equipo crece o si se
necesita reproducir el ambiente en otra cuenta de Supabase.

### 7. Discrepancia README vs. dependencias reales (SQLite)
**Estado:** corregido en la documentación nueva, pendiente en el README original si aplica.

El `README.MD` original mencionaba `better-sqlite3` como ORM, pero `package.json` usa el paquete
`sqlite3` directamente (callback-based, no el driver síncrono `better-sqlite3`). Ya reflejado
correctamente en `AGENTS.md` y `docs/SCHEMA.md`.

### 8. Sin `lint` ni `test` configurados
**Estado:** abierto, aceptado como decisión consciente por ahora (ver `AGENTS.md`).

No hay ESLint/Prettier ni ningún framework de testing configurado en `package.json`. No es un
bloqueante inmediato, pero si el equipo crece más allá de un desarrollador, vale la pena introducir
al menos un linter para mantener consistencia de estilo.

### 9. Falta de Unit Tests para Utilidades Puras
**Estado:** abierto (depende del punto 8).

Se ha aislado con éxito lógica de negocio compleja en funciones puras (ej. `importUtils.js`, validaciones en `productsImportService.js` y `productKitsService.js`), pero no existen pruebas unitarias que garanticen su funcionamiento ante futuros cambios.

**Recomendación:** Una vez configurado el entorno de testing (Vitest/Jest), redactar pruebas para estos módulos como prioridad.

### 10. Revisión de Roles y Permisos (Supabase vs Local)
**Estado:** abierto — parcialmente documentado.

Falta confirmar si el rol `admin` en Supabase tiene roles hermanos (ej. cajero, gerente) y definir formalmente si los permisos locales de SQLite deben sincronizarse con los de Supabase, para evitar discrepancias de autorización entre entornos.

**Actualización (24 ago 2026):** se confirmó que en Supabase solo existen los roles `admin` y
`cajero` (no `gerente`). Se documentó la arquitectura completa del sistema de roles/permisos remoto
en `PERMISSIONS.md`. Sigue sin confirmarse si el sistema local de SQLite (`src/backend/bd.js`) se
sincroniza de alguna forma con este sistema remoto, o si son completamente independientes — ver
también el punto 13 de este documento.

---

## Bajo

### 11. Icono de la app con ruta idéntica en dev/prod
**Estado:** cosmético.

En `electron/main.js`, `getMainWindow()` calcula `iconPath` con una rama `isDev ? X : X` donde
ambos casos resuelven a la misma ruta (`../icon.ico`) — el condicional no tiene efecto real. No es
un bug funcional, pero es código muerto que se puede simplificar.

### 12. Desarrollo de Vistas Pendientes
**Estado:** abierto.

Faltan implementar las vistas base de la arquitectura:
- `/inventory` (Inventario)
- `/invoices` (Facturas)
- `/cashout` (Corte de caja)
- `/settings` (Configuración)

### 14. Usuario con dominio de correo distinto a la convención interna
**Estado:** abierto — nuevo, detectado el 24 de agosto de 2026.

El usuario `alexander@example.com` (rol `cajero`, activo) no sigue la convención
`@internal.crokets` que usan los otros 3 usuarios reales (`carlos`, `tristan`, `kari`). Todo indica
que es una cuenta de prueba.

**Recomendación:** confirmar con el equipo si es una cuenta de prueba y, de ser así, desactivarla
(`status = false`) o eliminarla antes de distribuir el sistema a un negocio real.

---

## Cómo usar este documento

- Al encontrar un problema nuevo durante el desarrollo, agregarlo aquí con severidad y una
  descripción breve de impacto — no dejarlo solo como comentario perdido en el código.
- Al resolver un pendiente, no borrarlo: cambiar su `Estado` a **Resuelto** y agregar la fecha o el
  commit/PR que lo corrigió, para mantener historial de qué se ha ido arreglando.
- Los ítems nuevos se numeran de forma consecutiva al final (no se renumeran los existentes), para
  que las referencias cruzadas desde `BACKLOG.md` y otros documentos no queden rotas.
