# KNOWN_ISSUES.md — Pendientes y deuda técnica conocida

Registro centralizado de problemas identificados en el proyecto. El objetivo es que no queden
como notas sueltas dentro de otros documentos — cualquier pendiente nuevo que se descubra debería
agregarse aquí con su severidad y estado.

Severidad: **Crítico** (bloquea funcionalidad o expone datos) / **Alto** (riesgo real, no urgente)
/ **Medio** (deuda técnica) / **Bajo** (cosmético / conveniencia).

---

## Crítico

### 1. El backend local no arranca en producción
**Estado:** resuelto (14 sep 2026) — rama `fix/production-backend`.

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

**Resolución (14 sep 2026):** se eliminó la dependencia del servidor Express local en el frontend.
Los tres endpoints que el renderer consumía en rutas de producción —`POST /device/branch`
(`Login.jsx`) y `POST /cash/check` + `POST /cash/open` (`CashRegister.jsx`)— se migraron a RPCs de
Supabase (`get_branch_by_device`, `get_cash_register_session`, `open_cash_register`; migraciones
`20260914120000` y `20260914120100`, aplicadas con `supabase db push`). El login legacy por SQLite
(`/login`) y `/cash/close` no los invoca el frontend. Con esto el instalador ya no necesita iniciar
`src/backend/server.js`, ni empaquetar la `SUPABASE_SERVICE_ROLE_KEY` (que `AGENTS.md` prohíbe
exponer en el instalador), ni resolver el ABI de `sqlite3` contra el runtime de Electron.
`electron/main.js` y el script `npm run dev` se conservan sin cambios para desarrollo local.

### 2. Contraseña del usuario admin en texto plano
**Estado:** resuelto (14 sep 2026) — rama `fix/production-backend`.

En `src/backend/bd.js`, el usuario `admin` local se crea con contraseña `'1234'` sin hash
(`bcrypt` o similar), y se compara presumiblemente en texto plano en el login. Si el archivo
`users.db` o el instalador se distribuyen tal cual, la contraseña es visible para quien acceda al
archivo.

**Recomendación:** hashear contraseñas con `bcrypt` antes de guardar/comparar, y forzar cambio de
contraseña del admin en el primer inicio de sesión.

**Resolución (14 sep 2026):** se agregó `bcryptjs` (JS puro, sin ABI nativo) y el helper
`src/backend/password.js` (`hashPassword` / `verifyPassword` / `isBcryptHash`). La siembra del admin
(`bd.js`) y las rutas de alta y edición de usuarios (`POST` / `PUT /api/users`) guardan hash bcrypt;
`/login` compara con `bcrypt.compare` y ya no consulta por contraseña en el `WHERE`. Las filas
legacy en texto plano se migran de forma transparente en el primer login exitoso (`verifyPassword`
devuelve `needsUpgrade` y el servidor re-hashea). Cubierto por `src/backend/password.test.js`.
**Pendiente:** la recomendación de forzar el cambio de contraseña del admin en el primer inicio de
sesión no se implementó (queda como mejora futura).

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

### 18. RPC de comisiones pagaba comisión por ventas canceladas (filtro `'canceled'`)
**Estado:** resuelto — migración `supabase/migrations/20260910120500_fix_commissions_status_filter.sql`,
rama `perf/report-optimization`, 10 de septiembre de 2026.

Las funciones `get_commissions_report_data` (migraciones `20260910120200` y `20260910120400`)
filtrarían `s.status != 'canceled'` (una sola "L"). El enum canónico de ventas canceladas en la app
es `'cancelled'` (`src/utils/ticketBuilder.js:941`, `reportsDashboardUtils.js:149`,
`salesHistoryService.js:13`) con `'cancelada'` en importaciones legacy, por lo que la exclusión
nunca matcheaba y las ventas canceladas devengaban comisión.

**Origen:** deuda preexistente replicada del client legacy (el `fetchCommissionsData` previo al RPC
usaba `.neq("status", "canceled")`); identificada durante la auditoría del PR de optimización de
reportes.

**Impacto:** montos de comisión sobreliquidados si existían tickets cancelados en el periodo.

**Recomendación:** al aplicar la migración, verificar que los totales del reporte excluyen los
tickets `'cancelled'`/`'cancelada'`. El test contract en
`commissionsReportService.test.js` cubre que el filtro de canceladas queda delegado al RPC (sin
`p_status` en cliente).

---

## Medio

### 6. Sin migraciones SQL versionadas para Supabase
**Estado:** parcialmente resuelto — 9 de septiembre de 2026.

El schema completo de las tablas remotas (ver `docs/SCHEMA.md`) vive únicamente en el proyecto de
Supabase (dashboard remoto). No había carpeta `supabase/migrations/` en el repo, por lo que no
había forma de recrear el schema desde cero solo con este repositorio, ni de rastrear cambios de
estructura en el historial de git.

**Actualización (24 ago 2026):** se generó un inventario manual completo del schema por
introspección directa — ver `SCHEMA.md`. Esto mitiga parcialmente el problema (ya hay una
referencia versionada en Git), pero no sustituye migraciones reales ejecutables.

**Actualización (9 sep 2026):** se creó la carpeta `supabase/migrations/` con la primera migración
versionada (`20260909123000_get_branch_products_paginated.sql`, RPC de paginación server-side para
la lista de productos), aplicada al remoto con `supabase db push`. El resto del schema sigue sin
snapshot ejecutable.

**Recomendación:** generar un baseline de las tablas existentes (ej. `supabase db dump` a una
migración inicial) y adoptar el flujo de migraciones versionadas para los próximos cambios.
Ver `PERMISSIONS.md` / `SCHEMA.md` para el estado actual detallado.

### 7. Discrepancia README vs. dependencias reales (SQLite)
**Estado:** corregido en la documentación nueva, pendiente en el README original si aplica.

El `README.MD` original mencionaba `better-sqlite3` como ORM, pero `package.json` usa el paquete
`sqlite3` directamente (callback-based, no el driver síncrono `better-sqlite3`). Ya reflejado
correctamente en `AGENTS.md` y `docs/SCHEMA.md`.

### 8. Sin `lint` ni `test` configurados
**Estado:** parcialmente resuelto — 9 de septiembre de 2026 (test listo; lint pendiente).

No había ESLint/Prettier ni framework de testing configurado en `package.json`. Se configuró
**Vitest 5** (`vitest.config.js` con globals y jsdom, script `npm test`) y quedó habilitada la
suite inicial de 19 tests (funciones puras de `productFormatters` y el archivo preexistente de
`useSalesTotals`, que requería `@testing-library/react` y `jsdom` como devDependencies).

**Actualización (9 sep 2026):** la suite creció a **44 tests** al incorporar `usePagination`
(10 tests: defaults, clamps de página, cambio de tamaño, persistencia en `localStorage`,
ajuste de página al reducir el total) y `productCrudService` (15 tests que verifican los
contratos `{success, data, error, partial}` de create/update/delete, barcode duplicado `23505`,
`partial:true` cuando el inventario falla tras crear el producto y errores inesperados).
El lint (ESLint/Prettier) sigue sin configurarse: no es bloqueante inmediato, pero vale la pena
introducir al menos un linter para mantener consistencia de estilo conforme el equipo crece.

### 9. Falta de Unit Tests para Utilidades Puras
**Estado:** parcialmente resuelto — 9 de septiembre de 2026.

Se aisló con éxito lógica de negocio compleja en funciones puras (ej. `importUtils.js`, validaciones en `productsImportService.js` y `productKitsService.js`), pero no existían pruebas unitarias. Con la configuración de Vitest (punto 8) quedaron cubiertos los formateadores puros del catálogo (`productFormatters.js`, 13 tests: `buildDepartmentMap`, `buildInventoryProductIds`, `formatBranchKardexProducts`, `formatGlobalProductsWithoutInventory`), la suite preexistente de `useSalesTotals`, el hook global `usePagination` (10 tests) y los contratos de CRUD de productos en `productCrudService` (15 tests).

**Actualización 2 (9 sep 2026):** se agregó la cobertura de Importación y Kits con la suite en **83 tests**:
- `importUtils` (14 tests de funciones puras: `normalizeText`, `normalizeHeader`, `parseBoolean`, `parseNumber`, `formatCurrency` y catálogos de columnas).
- `productsImportService` (11 tests con `supabase` y `validateSatClaves` mockeados: validación de datos, sucursales/departamentos, creación de departamentos faltantes y `processImportTransaction` con inventario por sucursal, productos globales y rollback cuando falla la inserción de inventario).
- `productKitsService` (13 tests: `fetchKits` filtrando productos inactivos, detección de duplicados por barcode/nombre, alta con rollback, actualización restaurando items previos, baja con reversión, y lecturas de consulta).

**Recomendación:** con los servicios de import/kits cubiertos, la siguiente capa de valor sería automatizar los RPC de ventas (`create_sale_transaction`, `create_transfer_order`) y las funciones de `verifierService` / `salesCalculationService` si se quiere supervisión unitaria de las transacciones atómicas.

### 10. Revisión de Roles y Permisos (Supabase vs Local)
**Estado:** abierto — parcialmente documentado.

Falta confirmar si el rol `admin` en Supabase tiene roles hermanos (ej. cajero, gerente) y definir formalmente si los permisos locales de SQLite deben sincronizarse con los de Supabase, para evitar discrepancias de autorización entre entornos.

**Actualización (24 ago 2026):** se confirmó que en Supabase solo existen los roles `admin` y
`cajero` (no `gerente`). Se documentó la arquitectura completa del sistema de roles/permisos remoto
en `PERMISSIONS.md`. Sigue sin confirmarse si el sistema local de SQLite (`src/backend/bd.js`) se
sincroniza de alguna forma con este sistema remoto, o si son completamente independientes — ver
también el punto 13 de este documento.

### 15. Paginación de tablas de reportes duplicada (migrar a usePagination global)
**Estado:** completado — migración de client-side, server-side (Sales) e híbrido (Cash) terminada el 9 de septiembre de 2026 (rama `feature/products-pagination`).

El patrón de paginación (filas por página, selector "Mostrar", botones Anterior/Siguiente) estaba
duplicado en ~20 componentes del módulo de reportes, cada uno con su propio `useState` de
`pageSize`/`currentPage` y derivaciones de `totalPages` y slice.

Se creó el hook global `src/hooks/usePagination.js` cubriendo ambas variantes — client-side con
`pageItems(items)` y server-side con `startIndex`/`endIndex` — y se adoptó en la lista de
productos (`useProductsList`).

**Migrado a `usePagination` (client-side, commit `04cd71f`):**
- Rentabilidad: `ProfitabilityDepartmentsTable`, `ProfitabilityProductsTable`,
  `ProfitabilityCriticalTable` (selector [5,10,20] en departamentos).
- Inventario: `ReorderSuggestionsTable`, `InventoryValuationTable`, `InventoryDepartmentSummary`.
- Comisiones: `CommissionsAuditTable`, `CashiersCommissionSummaryTable`,
  `ProductsCommissionSummaryTable` y `useCashierCommissionDetail` + `CashierCommissionDetailModal`
  (independientemente del modo [5,10,20] del modal).
- Clientes: `CustomersRankingTable`, `CustomersProductsSummaryTable`, `CustomersRewardsSummaryTable`,
  `ProductBuyersModal`, `CustomerDetailProductsTab`, `CustomerDetailPointsTab`,
  `CustomerDetailSalesTab`.
- Productos: `TopProductsTable`, `DeadStockTable` (paginación fija de 50/ítem, sin selector).

**Migrado a `usePagination` (server-side):**
- `PageSalesReport` + `useSalesReport`: el hook centraliza `currentPage`/`totalPages`/`startIndex`/
  `endIndex` derivando de `totalCount` que llega de `getPaginatedSales` (query con `range`); el
  `export default` de `ITEMS_PER_PAGE` se mantiene fijo (sin selector de tamaño de página).

**Migrado a `usePagination` (híbrido):**
- `useCashReport`: dos instancias `usePagination` (sesiones y movimientos) con `pageSizeOptions`
  fijo de 5, compartidas con `CashSessionsTable`/`CashMovementsTable` (UI de paginación por props,
  sin estado propio) y reseteo en `loadReportData` al cambiar filtros.
- `DetailMovementsSection`/`DetailDiscountsSection` (tamaño fijo 5) del modal de detalle de sesión.

**Unificación visual con `PaginationBar` (extraído):**
- Nuevo `components/PaginationBar/PaginationBar.jsx` (+ `.module.css`) compartido por los ~24
  consumers: cash, comisiones, clientes (incl. modales), inventario, productos (reporte y
  `ProductsList`), rentabilidad (3 tablas) y ventas (server-side). Admite selector de páginas
  opcional (`pageSizeOptions`), modo de modal y `labelMode` (rango / página), exponiendo
  `currentPage`/`totalPages`/`startIndex`/`endIndex` de `usePagination`.
- Se eliminó el componente duplicado `ProfitabilityTablePagination.jsx` y las clases de paginación
  huérfanas de los `*.module.css` de cash, comisiones (inventario/commissions mantienen las del
  modal `CashierCommissionDetailModal`), clientes, inventario, producto y ventas.

**Impacto:** desapareció la duplicación en todos los reportes; el patrón unifica el reseteo a
página 1 al cambiar el tamaño de página (antes inconsistente en 4 tablas de comisiones) y centraliza
el estilo y el marcado del footer de paginación en un único componente.

### 16. Umbral de escalabilidad del catálogo de productos en memoria
**Estado:** resuelto — 9 de septiembre de 2026.

`ProductsContext.loadProducts` cargaba el catálogo global completo (productos + inventario de la
sucursal) en memoria y lo compartía con 9 hooks de los módulos de productos e inventario. Con un
catálogo de ~1000 SKUs y creciendo, se aplicó `.limit(10000)` explícito
(`MAX_CATALOG_ROWS_TO_LOAD`) en las 3 queries de `loadProducts` para evitar el truncamiento
silencioso del límite por defecto de Supabase (1000 filas por query).

**Actualización (9 sep 2026):** `ProductsContext` fue refactorizado (rama
`refactor/products-context`). La lógica de datos y CRUD se extrajo a `src/services/products/`
(`productCatalogService`, `productFormatters`, `productCrudService`, `departmentService`,
`productDiscountService`) y el Context quedó como capa delgada de estado sin cambiar las props
consumidas (se removieron solo las muertas: `loadingDepartments`, `departmentsError`,
`deleteDepartment`). La suscripción realtime quedó extraída a `src/hooks/useProductsRealtime.js`
(debounce 500 ms, supresión 1500 ms tras mutación local y filtro de `branch_inventory` por
sucursal activa).

**Actualización final (9 sep 2026):** `ProductsList` quedó migrada a paginación server-side a
través del RPC `get_branch_products_paginated` (migración
`supabase/migrations/20260909123000_get_branch_products_paginated.sql`, ya aplicada con
`supabase db push`). El RPC replica exactamente el conjunto y orden del catálogo anterior
(inventario de la sucursal + productos globales activos sin inventario en esa sucursal, ordenados
por `tracks_inventory` y nombre) y devuelve `total_count` en cada fila para alimentar
`usePagination` sin consultas extra. `useProductsList` quedó desacoplado de `ProductsContext`
(usa `useBranch`, `usePagination`, `useProductsRealtime` y `fetchPaginatedBranchProducts`). El
catálogo completo en memoria sigue cargándose en el Context para las demás vistas (Kardex, altas,
modificaciones, bajas e inventario).

**Actualización final 2 (9 sep 2026):** la migración de `ProductsList` a paginación server-side
provocó que dos instancias de `useProductsRealtime` (ProductsContext y `useProductsList`) intentaran
suscribirse al mismo canal `products-realtime-<branchId>` con el mismo cliente, lo que rompía la app
con `Uncaught Error: cannot add 'postgres_changes' callbacks ... after subscribe()` (pantalla blanca
al entrar a Productos). Se corrigió (`e7f457b`) con un **registry global compartido por sucursal**:
un solo canal por `branchId`, creado con sus callbacks `.on(...)` antes del `subscribe()` y nunca
después; cada instancia registra su propio `onInvalidate` con debounce (500 ms) y supresión local
(1500 ms tras `markLocalMutation`), y el canal se elimina con `supabase.removeChannel` solo cuando
la última instancia que lo usa se desmonta.

**Impacto:** la lista de productos ya no depende del payload completo del catálogo; el payload por
página es limitado y filtrado en el servidor.

**Recomendación:** si otras vistas (Kardex, altas, inventario) superan el umbral, migrar sus
consultas al mismo patrón RPC paginado en lugar de `fetchBranchCatalog`.

### 19. Base de la comisión % en la RPC difiere del client legacy (bruta vs neta)
**Estado:** abierto — requiere verificación con datos reales antes de tocar código (10 sep 2026).

La RPC calcula la comisión porcentual sobre `unit_price * quantity` (monto bruto), mientras el
client legacy (`commissionsCalculationService.js:45`) la calculaba sobre `total_price` (neto de
línea). Cuando una partida tiene descuento (`discount_amount`/`ln`), las bases difieren. Además la
RPC no replica la inferencia de descuentos implícitos del legacy (diferencia `sale_price` vs
`unit_price`; `unit_price*qty` vs `total_price`) para la bandera `has_discount`.

**Impacto:** posible divergencia en montos de comisión y en el filtro "con descuento" del reporte
respecto a los resultados previos del RPC.

**Recomendación:** validar con una muestra real de ventas con descuento si `sale_details.total_price`
es el neto post-descuento y decidir la base canónica (neto) para alinear la RPC. Vinculado a
`BACKLOG.md`.

### 20. Precedencia commission_value/percent y bordes de has_commission y tipo `'percentage'`
**Estado:** abierto — bordes de bajo impacto (10 sep 2026).

En la RPC de comisiones: la comisión % usa `COALESCE(commission_percent, commission_value, 0)`
mientras el legacy usaba `commission_value || commission_percent` (precedencia opuesta,
`commissionsCalculationService.js:18`); `has_commission` es `true` aunque el valor sea 0 (el legacy
devolvía `false` cuando `commVal <= 0`, `:27`); y el tipo `'percentage'` (sinónimo aceptado por el
legacy, `:44`) ya no se interpreta — se calcula como flat.

**Impacto:** bordes: filas marcadas comisionables con montos 0, productos con ambos campos seteados
distintos, o configurados con tipo `percentage`.

**Recomendación:** al tocar la base de comisión (punto 19), normalizar la precedencia,
`has_commission` y el alias `percentage`.

### 21. RPC de caja: CTE session_payments escanea todo el histórico sin pushdown de fecha
**Estado:** abierto — escalabilidad (10 sep 2026).

`get_cash_report_sessions` (migración `20260910120100`) agrega `sale_payments` completos en el CTE
`session_payments` y solo acota por ventana de sesión en el JOIN final; no hay pushdown del rango de
fechas dentro del CTE y falta un índice acotado para el join por ventana.

**Impacto:** a medida que crece el histórico de pagos, el reporte de caja puede degradarse.

**Recomendación:** acotar el CTE por rango de fechas (o filtrar por `sale_id IN (...)` del periodo) y
evaluar un índice compuesto, p. ej. `sale_payments (branch_id, created_at)`.

### 22. Rentabilidad: procesamiento de partidas secuencial por chunks sin concurrencia
**Estado:** abierto — escalabilidad (10 sep 2026).

`profitabilityReportService.js` recorre `sale_details` en chunks de `CHUNK_SIZE = 100` con un bucle
`for await` totalmente secuencial; con periodos grandes (decenas de miles de tickets) eso puede
implicar hasta ~1000 requests encadenados.

**Impacto:** latencia del reporte de rentabilidad en periodos largos.

**Recomendación:** introducir concurrencia acotada (batches paralelos de tamaño fijo con
`Promise.all` limitado) o mover la agregación a un RPC, siguiendo el patrón de comisiones/caja.

### 25. Agregación del reporte de inventario inline en el service sin CalculationService puro
**Estado:** abierto — consistencia con `CODE_STANDARDS.md` (10 sep 2026).

`inventoryReportService.fetchInventoryReportData` agrupa filas, calcula KPIs/reorder/sugerencias y
construye resúmenes por departamento inline, sin `*CalculationService` puro (a diferencia de
comisiones, que sí separa `commissionsCalculationService.js`). La lógica queda dividida entre SQL
(estados/umbrales por fila en `get_inventory_report_data`) y JS (agregación), lo que complica el
testeo y reuso (SRP).

**Impacto:** mantenibilidad y cifras sujetas a duplicar criterios si el RPC cambia umbrales.

**Recomendación:** extraer las agregaciones a un `inventoryReportCalculationService.js` puro
(patrón del repo) manteniendo el contrato actual.

### 26. RPCs de reportes concedían EXECUTE a `anon` (exposición de datos sin sesión)
**Estado:** resuelto — migración `20260910120600_restrict_report_rpc_grants.sql`, 10 sep 2026.
Detectado en el micro-pase de seguridad (skill `security-best-practices`).

Los RPCs de reportes concedían `GRANT EXECUTE ... TO anon, authenticated`:
`20260910120100:93` (caja), `20260910120200:122` y `20260910120400:123` y `20260910120500:125`
(comisiones), `20260910120300:127` (inventario). Al ser funciones `LANGUAGE sql` invoker y existir
tablas de datos con RLS `USING(true)` (ver punto 13), un llamador **sin sesión** podía invocar los
reportes con la anon key pública.

**Fix:** la migración `20260910120600` revoca `EXECUTE ... FROM anon` de los 3 RPCs conservando
`authenticated`. La app solo los llama con sesión (`AuthContext`, `src/App.jsx:22`), sin impacto
funcional.

**Follow-up resuelto (14 sep 2026):** la migración
`20260914120200_revoke_anon_get_branch_products_paginated.sql` revoca `EXECUTE ... FROM anon` del
RPC base `get_branch_products_paginated` (aplicada con `supabase db push`). `authenticated` lo
conserva y `useProductsList` solo lo llama con sesión, sin impacto funcional.

### 29. RPCs de caja no validan membresía de sucursal (`user_branches`)
**Estado:** abierto — detectado en la auditoría del cluster #1 (14 sep 2026).

`get_cash_register_session` y `open_cash_register` (migración `20260914120100`) son `SECURITY
DEFINER` y reciben `p_branch_id` del cliente sin verificar que el usuario autenticado pertenezca a
esa sucursal en `user_branches`. Cualquier usuario con sesión puede consultar o abrir la caja de
cualquier sucursal. Es paridad con el backend Express anterior (usaba service role y confiaba en el
`branchId` del cliente) y con la postura actual "todo autenticado es de confianza" (punto #13), pero
no escala a multi-sucursal con roles diferenciados.

**Impacto:** un cajero de la sucursal A podría abrir/consultar la caja de la sucursal B con la anon
key pública y su propia sesión.

**Recomendación:** validar membresía en `user_branches` (o `is_admin()`) dentro de las RPC, y/o
alinear con la decisión de #10/#13. Ver excepción documentada en `docs/SUPABASE_MIGRATIONS.md`.

### 30. `get_branch_by_device` es anon + `SECURITY DEFINER` (excepción de login pre-auth)
**Estado:** abierto — decisión consciente documentada (14 sep 2026).

El login debe resolver la sucursal del equipo **antes** de autenticar, por lo que la RPC
`get_branch_by_device` (migración `20260914120000`) se concede a `anon` y es `SECURITY DEFINER`
(rompe RLS). Devuelve solo `{ id, name, code }` de la sucursal activa asociada a un `device_code`,
que se genera con `crypto.randomUUID()` (`electron/main.js:20`) y por tanto no es enumerable.

**Impacto:** es la única función anon-executable que rompe RLS; con la anon key pública alguien
podría sondear `device_code` (no enumerable) o abusar del endpoint.

**Recomendación:** cuando el volumen de POS crezca, mover la resolución a una edge function con rate
limiting o a un intercambio one-time; mientras tanto, mantener el retorno mínimo y monitorear. Ver
excepción documentada en `docs/SUPABASE_MIGRATIONS.md`.

---

## Bajo

### 11. Icono de la app con ruta idéntica en dev/prod
**Estado:** cosmético.

En `electron/main.js`, `getMainWindow()` calcula `iconPath` con una rama `isDev ? X : X` donde
ambos casos resuelven a la misma ruta (`../icon.ico`) — el condicional no tiene efecto real. No es
un bug funcional, pero es código muerto que se puede simplificar.

### 12. Desarrollo de Vistas Pendientes
**Estado:** resuelto (14 sep 2026).

Las vistas base de la arquitectura ya están implementadas y enrutadas. Evidencia: `src/App.jsx:52-63`
registra `/dashboard`, `/products/*`, `/cashcut/*`, `/inventory/*`, `/invoices/*`, `/customers/*`,
`/reports/*`, `/settings` y `/profiles`, con sus páginas correspondientes en `src/pages/`
(`Inventory`, `Invoices`, `CashCut`, `Settings`, `Reports`, `Customers`, `Profiles`).

Nota: la ruta de corte de caja es `/cashcut/*` (no `/cashout`, como figuraba en este punto y en
`TEMPLATE_NUEVA_PAGINA.md`). Ver también `TEMPLATE_NUEVA_PAGINA.md`, actualizado en la misma fecha.

### 14. Usuario con dominio de correo distinto a la convención interna
**Estado:** abierto — nuevo, detectado el 24 de agosto de 2026.

El usuario `alexander@example.com` (rol `cajero`, activo) no sigue la convención
`@internal.crokets` que usan los otros 3 usuarios reales (`carlos`, `tristan`, `kari`). Todo indica
que es una cuenta de prueba.

**Recomendación:** confirmar con el equipo si es una cuenta de prueba y, de ser así, desactivarla
(`status = false`) o eliminarla antes de distribuir el sistema a un negocio real.

### 17. Archivos sin salto de línea final (EOF newline)
**Estado:** abierto — detectado el 9 de septiembre de 2026 durante el refactor de `ProductsContext`.

`AGENTS.md` y `CODE_STANDARDS.md` exigen que todos los archivos terminen con un salto de línea final
(EOF newline), pero decenas de archivos preexistentes en `src/` no lo cumplen (p. ej.
`src/main.jsx`, `src/App.jsx`, `src/contexts/BranchContext.jsx`, `src/hooks/useEscapeKey.js`,
`src/backend/server.js`, `src/utils/ticketBuilder.js`). Durante el refactor se corrigió en los
archivos nuevos de `src/services/products/` y en `src/contexts/ProductsContext.jsx`, pero el resto
del árbol sigue pendiente.

**Impacto:** diffs con ruido y advertencias de herramientas; va contra el estándar del propio repo.

**Recomendación:** normalizar con un script masivo (recorrer los archivos rastreados por git y
añadir `\n` a los que falten) en una tarea dedicada de limpieza.

### 23. Migraciones de comisiones re-definidas en cascada (CREATE OR REPLACE correctivo)
**Estado:** no procede (cerrado) — las migraciones ya fueron aplicadas al remoto
(`supabase db push`, 10 sep 2026), por lo que no se pueden aplastar sin resetear proyectos
externos.

`20260910120400_commissions_rpc_unlimited_default.sql` re-define íntegramente la función ya creada
en `20260910120200` (mismo body salvo el default de `p_page_size`), y
`20260910120500_fix_commissions_status_filter.sql` vuelve a re-definirla. Es un flujo válido de
migraciones, pero añade ruido mientras el RPC no haya llegado a producción — observación que quedó
sin efecto porque las tres ya están aplicadas al proyecto remoto.

**Impacto:** historial de migraciones con funciones re-definidas en cascada (aceptado; corrección
por migración propia a partir de aquí).

### 24. ruleLabel de comisiones cambió de formato vs legacy
**Estado:** abierto — QA visual pendiente (10 sep 2026).

La RPC genera `rule_label` como `percent: 10%` / `<tipo>: <valor>` (migración `20260910120200`),
mientras el legacy mostraba `10.00%` y `$5.00 / pz` (`commissionsCalculationService.js:46,50`). El
cambio es intencional y está cubierto por el test contract, pero la UI del reporte mostrará
etiquetas distintas a las previas.

**Impacto:** cosmético — requiere confirmación visual del formato deseado en la tabla de detalle.

**Recomendación:** QA manual del reporte y, si se prefiere el formato legacy, ajustar `rule_label`
en la RPC (y su test).

### 28. Guard de autorización de administrador duplicado en módulos (ProtectedRoute)
**Estado:** resuelto (10 sep 2026).

Cada módulo (Productos, Reportes, y originalmente Facturas) mantenía su propia copia del guard:
`ProtectedProductRoute`, `ProtectedReportRoute` y el hook `useProtectedNavigation` (que además
bloqueaba la navbar del módulo). Esto generaba duplicación de lógica, estilos y mantenimiento.

**Corrección:** se consolidó un componente compartido `src/components/ProtectedRoute/` y se
eliminaron las copias por módulo. El hook `useProtectedNavigation` (bloqueo de navbar) se retiró
porque el guard re-renderiza a los hijos sin navegación real; la navbar del módulo ya no necesita
interceptar clicks. Ver `BACKLOG.md` para el ítem de backlog asociado.

**Actualización (13 sep 2026):** el hook se **reintrodujo** como intercepción a nivel navbar (no como
duplicación del guard): el guard `ProtectedRoute` cambia la URL antes de mostrar el modal, mientras
que la navbar debe bloquear la navegación ANTES de que ocurra. Ver punto #27.

### 27. Intercepción de navegación protegida en navbars de módulo (`useProtectedNavigation`)
**Estado:** resuelto (13 sep 2026).

Tras consolidar el guard en `ProtectedRoute` (ver #28), la navbar del módulo dejó de interceptar
clicks. Como consecuencia, un usuario no-admin que hacía clic en una sección protegida (p. ej.
Reportes a Ventas) **navegaba** a la URL protegida y `ProtectedRoute` mostraba el modal sobre la
página destino; al cerrar sin autorizar quedaba en la URL protegida con el mensaje "Se requiere
autorización de administrador...".

**Corrección:** se reintrodujo el hook compartido `src/hooks/useProtectedNavigation.js` para
interceptar el click ANTES de que React Router navegue: si el item lleva `action` y el usuario no es
admin, la navegación NO ocurre (el usuario se queda exactamente en la página actual) y se abre el
`AdminAuthorizationModal` compartido encima; al autorizar con credenciales válidas recién navega.
`ProtectedRoute` se conserva como fallback de deep-link (entrar por URL directa).

**Fuente única:** el vocabulario protegido por módulo (`routePath`/`routeLabel`/`action`) se
centralizó en `src/config/adminProtectedSections.js` (helper puro `withProtectedMetadata`),
consumido por los 3 navbars de módulo (Reports, Products, Invoices) para no duplicar strings. La
navbar global no se intercepta: solo expone hubs públicos, ninguna sub-sección protegida.

**Impacto:** UX correcta (el modal aparece sobre la página actual sin cambiar la URL) y sin
duplicar el guard ni el vocabulario de permisos.

**Actualización 2 (13 sep 2026):** se corrigió un bloqueante detectado en la auditoría del PR #105:
la autorización otorgada desde el navbar no llegaba al guard recién montado (el `ProtectedRoute`
consolidado había perdido el registro `authorizedRoutes` del legacy), por lo que un usuario no-admin
autorizaba y, al navegar, `ProtectedRoute` volvía a negar el acceso y a abrir el modal sobre la
página destino. Se reintrodujo el registro `authorizedRoutes` (Set por montaje de módulo, dueño: la
página de Reports/Products/Invoices) compartido entre navbar y guard: `useProtectedNavigation`
notifica `onProtectedAccessAuthorized(routePath)` al autorizar y `ProtectedRoute` consulta ese Set
antes de `checkUserIsAdmin`. Alcance por montaje (igual que el legacy): al salir del módulo y volver
se re-solicita autorización. Además, las páginas ahora derivan sus rutas protegidas de
`adminProtectedSections.js`, eliminando la copia de strings que quedaba en `Reports.jsx`. Cobertura:
tests de `withProtectedMetadata`, `useProtectedNavigation` y `ProtectedRoute`.

### 31. Residuo legacy del backend local tras el fix de producción (#1)
**Estado:** resuelto parcialmente (14 sep 2026) — queda solo el login legacy de SQLite (ver #10).

Con #1 resuelto, el frontend ya no consumía el backend Express local. En una segunda pasada se
eliminó todo el residuo muerto por definición:

- `electron/main.js` — handlers IPC `login`, `set-initial-cash`, `check-cash-register` y
  `close-cash-register` (y la variable `cashRegisterState`), junto con sus entradas en la whitelist
  de `electron/preload.js`. El renderer solo invoca `get-device-code`, `close-app` y los canales de
  zoom.
- `src/backend/server.js` — endpoints `/device/branch`, `/cash/check`, `/cash/open` y `/cash/close`,
  el helper `getActiveCashSessionWithUser` y el cliente `createClient(SUPABASE_SERVICE_ROLE_KEY)`.
  El backend local ya no usa Supabase ni lee variables de entorno (ver `docs/ENV_VARIABLES.md`).

**Pendiente:** `src/backend/bd.js`, las rutas `/login` y `/api/users` de `server.js` y
`password.js` se conservan como login legacy por SQLite; su eliminación o razón de ser (login
offline) es la decisión de #10. La dependencia `node-fetch` quedó sin uso al eliminar el handler
`login`; retirarla cuando se resuelva #10.

**Impacto:** el riesgo de recablear el renderer a `localhost:3000` y la última referencia en runtime
a la service-role key quedaron eliminados.

### 32. Verificar índice único de sesión de caja abierta por sucursal
**Estado:** resuelto (14 sep 2026).

`open_cash_register` (migración `20260914120100`) traduce un `unique_violation` en la respuesta de
negocio `CASH_ALREADY_OPEN_*`, lo que presupone un índice único parcial (una sesión abierta por
`branch_id`) en `cash_register_sessions`. Verificado el 14 sep 2026: el remoto **ya tenía** el índice
`ux_cash_register_sessions_one_open_per_branch` (visible en `supabase inspect db index-stats`). La
migración `20260914130000` lo detecta y no crea un duplicado; si en otro entorno faltara, verifica que
no haya sucursales con más de una caja abierta y crea
`cash_register_sessions_one_open_per_branch_idx` (`unique` sobre `branch_id` `where status = 'open'`).
Si el `db push` falla por duplicados, el mensaje indica cuántas sucursales hay que sanear primero.

**Impacto (antes):** si el índice no existía, dos aperturas concurrentes podían crear dos sesiones
abiertas (paridad con el backend anterior, que tenía la misma carrera).

### 33. Tope de apertura de caja sin panel de configuración
**Estado:** abierto — mejora pendiente (14 sep 2026).

El tope de efectivo inicial al abrir caja vive en `app_settings`
(`cash_register.max_opening_amount`, seed `1000000`) y `open_cash_register` lo lee con fallback
seguro (migración `20260914130000`). Hoy solo se puede cambiar por SQL: falta la pantalla de
configuración (y sus grants/policies de escritura, que hoy no existen a propósito) para editarlo
desde la app.

**Impacto:** el tope es configurable a nivel dato, pero requiere acceso a la DB para modificarlo.

**Recomendación:** al construir el panel de ajustes, agregar policy de escritura para rol admin
(usar `is_admin()` / `has_permission()`) y exponer el valor vía RPC o Edge Function.

### 34. Deuda menor de la pasada de producción (no bloqueante)
**Estado:** abierto — cosmético/robustez (14 sep 2026).

Hallazgos menores de la auditoría que no se corrigieron en el cluster de producción:

- `src/backend/server.js` — el `INSERT INTO users (username, password)` de respaldo (dentro del
  handler de alta) omite `name`, que es `NOT NULL`; ese camino siempre falla y es código muerto.
  Eliminar en el barrido de #10/#31.
- `src/backend/password.js` — bcryptjs se usa en su API síncrona (`hashSync`/`compareSync`), que
  bloquea el event loop por request; migrar a la API async si el backend local crece.
- `src/backend/bd.js:18` usa un emoji `✅` en `console.log` (preexistente, fuera del estilo del repo);
  limpiar junto con el login legacy.
- Mezcla de comillas dobles en `src/services/*` y tests nuevos frente a comillas simples en el resto
  del repo; unificar cuando se toque cada archivo.

### 35. Sesión de Supabase persistida en `localStorage`
**Estado:** abierto — aceptado con riesgo residual bajo (14 sep 2026).

`src/lib/supabaseClient.js` usa el `createClient` por defecto de `@supabase/supabase-js`, que guarda
`access_token` y `refresh_token` en `localStorage` (REACT-AUTH-001). Un XSS podría exfiltrar la
sesión. Hoy el riesgo es bajo porque no hay sinks XSS en el renderer (barrido sin
`dangerouslySetInnerHTML`/`innerHTML`/`eval`), y la CSP de producción (migración de frontend en
`vite.config.mjs`) reduce la superficie.

**Impacto:** sin sink ni CSP saltada no es explotable; es deuda de defensa en profundidad.

**Recomendación:** evaluar `storage` en memoria + PKCE, o mover la sesión a cookie `HttpOnly` cuando
exista un gateway/Edge Function que lo permita. Revisar al endurecer auth.

### 36. Assets con ruta absoluta bajo `file://` en el build empaquetado
**Estado:** Resuelto — 14 sep 2026 (validar instalador NSIS en Windows antes de distribuir).

`vite.config.mjs` no define `base`, por lo que Vite emite rutas absolutas
(`<script src="/assets/index-*.js">`). En producción Electron carga
`file://.../dist/index.html` (`electron/main.js`), y `/assets/...` resuelve a `file:///assets/...`
(raíz del sistema de archivos), no al directorio de `dist/`. Confirmado con
`new URL('/assets/index.js','file:///opt/app/dist/index.html').href` → `file:///assets/index.js`.

**Impacto:** el instalador NSIS podría abrir en blanco al no cargar JS/CSS.

**Resolución:** se agregó `base: './'` en `vite.config.mjs`; el build ahora emite
`./assets/index-*.js`. Verificado con un smoke test de Electron cargando
`file://.../dist/index.html` en un `BrowserWindow` oculto: React renderiza (`#root` con hijos), sin
`did-fail-load` ni errores de consola. Queda pendiente ejecutar el instalador empaquetado real en
Windows (ítem del checklist de `DEPLOYMENT.md`) antes de distribuir.

### 37. Ausencia de Content-Security-Policy en el renderer (SEC-1)
**Estado:** Resuelto — 14 sep 2026.

`index.html` no definía CSP, por lo que el renderer no tenía una segunda barrera contra inyección de
scripts (defensa en profundidad; relevante junto con #35, sesión en `localStorage`).

**Impacto:** sin CSP, un eventual sink XSS tendría vía libre para ejecutar script y exfiltrar la
sesión. No había sinks XSS en el código (barrido sin `dangerouslySetInnerHTML`/`innerHTML`/`eval`).

**Resolución:** `vite.config.mjs` inyecta una `Content-Security-Policy` estricta por `<meta>` solo en
el build de producción (`default-src 'self'`, `script-src 'self'`, `connect-src` limitado a
Supabase, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`). En dev no aplica para no
romper el HMR. Verificado en `dist/index.html`. Ver `DEPLOYMENT.md`.

### 38. Autorización de administrador gateada solo en el cliente (SEC-3)
**Estado:** Abierto — requiere verificación del lado servidor (14 sep 2026).

Las secciones administrativas se protegen en el renderer (`ProtectedRoute` +
`adminProtectedSections`, ver #27/#28) y el modal `AdminAuthorizationModal` re-autentica al admin vía
la Edge Function `authorize-admin-action` (`docs/EDGE_FUNCTIONS.md`). Falta confirmar que **toda**
acción administrativa sensible tenga además un control server-side (RLS/`has_permission()` en las
RPC/edge functions) y no dependa únicamente del gateo visual del cliente.

**Impacto:** un usuario con sesión que invoque directamente una RPC/edge function administrativa
saltándose la UI podría ejecutarla si el backend no la valida. Ligado a #13 (roles sin
diferenciación real) y #29.

**Recomendación:** auditar cada RPC/edge function administrativa y confirmar `is_admin()` /
`has_permission()` server-side; registrar el resultado por endpoint.

### 39. Endurecimiento de Electron incompleto (SEC-4)
**Estado:** Resuelto — 14 sep 2026.

`electron/main.js` no denegaba ventanas emergentes ni bloqueaba la navegación fuera del origen, y
`electron/preload.js` exponía canales IPC sin handler en el proceso principal (`log-message`,
`window-action`, `update-available`, `print-request`) además de `send`/`on`.

**Impacto:** una inyección en el renderer podía abrir ventanas o navegar a contenido externo, y el
allowlist de preload era más amplio que la superficie real.

**Resolución:** `setWindowOpenHandler` deniega ventanas, `will-navigate` bloquea la navegación fuera
del origen, se eliminaron los `console.log` de debug y el preload solo expone `invoke` con los canales
realmente registrados (`get-device-code`, `close-app`, `set-zoom-factor`, `configure-zoom`,
`reset-zoom`, `get-zoom-debug`).

### 40. Bundle único de ~3.2 MB sin code-splitting (PERF-1)
**Estado:** Resuelto — 14 sep 2026.

El build generaba un solo chunk (~3.2 MB, ~907 KB gzip) porque `App.jsx` importaba las 11 páginas de
forma eager y no había `manualChunks`.

**Impacto:** arranque más lento y mayor trabajo de parseo en cada carga del POS.

**Resolución:** `App.jsx` usa `lazy()` por ruta con `<Suspense>`; `vite.config.mjs` define
`manualChunks` (`react`, `supabase`, `spreadsheets`). El bundle inicial bajó a ~0.47 MB (~137 KB
gzip); `spreadsheets` (1.36 MB) solo carga bajo demanda.

### 41. `get_email_by_username` sin definición en migraciones versionadas
**Estado:** Abierto — detectado el 14 sep 2026 durante la optimización del login.

La RPC `get_email_by_username` la usa el login (`src/pages/Login/Login.jsx`) y está documentada en
`SCHEMA.md`, pero **no existe ningún `CREATE FUNCTION` para ella en `supabase/migrations/`**: solo
vive en el proyecto remoto (creada ad-hoc). Es una inconsistencia con #6 (migraciones versionadas
como fuente de verdad) y un riesgo para recrear el esquema desde cero.

**Impacto:** un entorno nuevo (o un `supabase db reset`) no tendría esta función y el login fallaría
al resolver el email; el esquema versionado no refleja el remoto.

**Recomendación:** capturar la definición actual (con `pg_get_functiondef`) en una migración nueva y
verificar sus grants. Se llama antes de autenticar, por lo que requiere `EXECUTE` para `anon` (misma
excepción pre-auth que #30); conviene confirmar que solo devuelve el email y nada más.
No se corrige en el PR de login para no ampliar su alcance.

### 42. `--scroll-distance` usada pero nunca definida (marquee de productos inerte)
**Estado:** Abierto — detectado el 14 sep 2026 durante la auditoría del PR de login.

`src/components/ProductsComponents/PageProducts/ProductsList/ProductsList.module.css:355` usa
`transform: translateX(calc(-1 * var(--scroll-distance)))` dentro de `@keyframes marqueeScroll`, pero
`--scroll-distance` **no se define en ningún CSS ni se setea inline** desde JS. Al no resolverse, el
keyframe del 50 % es inválido y la animación no traslada: el marquee del listado de productos queda
inerte (solo se ve el estado estático).

**Impacto:** visual menor — la animación de desplazamiento del marquee nunca ocurre.

**Recomendación:** definir la variable (p. ej. `--scroll-distance: 100px` en el propio módulo/global)
o setearla inline desde el componente según el ancho real del contenido; alternativamente, retirar la
animación si ya no se desea. Es un cambio de comportamiento de UI, por lo que se atiende en un PR
aparte y no en el de login.

---

## Cómo usar este documento

- Al encontrar un problema nuevo durante el desarrollo, agregarlo aquí con severidad y una
  descripción breve de impacto — no dejarlo solo como comentario perdido en el código.
- Al resolver un pendiente, no borrarlo: cambiar su `Estado` a **Resuelto** y agregar la fecha o el
  commit/PR que lo corrigió, para mantener historial de qué se ha ido arreglando.
- Los ítems nuevos se numeran de forma consecutiva al final (no se renumeran los existentes), para
  que las referencias cruzadas desde `BACKLOG.md` y otros documentos no queden rotas.
