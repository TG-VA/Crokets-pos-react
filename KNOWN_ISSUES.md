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

### 43. `useProductsList` con doble declaración rompía el build de producción

**Estado:** resuelto (15 sep 2026) — rama `cleanup/quick-win-debt`.

`src/components/.../ProductsList/hooks/useProductsList.js` contenía **dos** bloques de
`usePagination` que declaraban `currentPage`, `totalPages` y `pageSize` en el mismo scope
(líneas 42-56 y 138-153), además de un `const paginatedProducts = pageItems(filteredProducts)`
donde `filteredProducts` **no estaba definido**. Era el residuo de un merge que combinó la versión
client-side con la migración a paginación server-side (#16). El primer bloque (server-side, con
`totalItems: totalCount`) es el vigente; el `return` ya exponía `paginatedProducts: products`.

**Impacto:** `npm run build:frontend` fallaba con
`Identifier "currentPage" has already been declared` (rollup), por lo que no se podía generar el
instalador. Detectado al verificar esta rama.

**Resolución (15 sep 2026):** se eliminó el bloque duplicado y la línea muerta con
`filteredProducts`. `npm run build:frontend` completa correctamente (282 módulos).

---

## Alto

### 3. Componentes "dios" (god components) que violan SRP

**Estado:** **100% resuelto (23 sep 2026)** — todos los componentes listados quedaron modularizados; ver tabla y bitácora.

Varios archivos concentran demasiada responsabilidad (UI + lógica de negocio + llamadas a datos)
en un solo componente:

| Archivo                                                                                    | Líneas | Nota                                                               |
| ------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------ |
| `src/pages/CashCut/CashCut.jsx`                                                            | ~372   | orquesta hooks + vistas; refactor #3 en curso                      |
| `src/utils/ticket/`                                                                        | ~1710  | `ticketBuilder` descompuesto en 8 módulos puros + orquestador      |
| `src/components/CustomersComponents/Modals/RewardModal/RewardModal.jsx`                    | 280    | refactor Fase 3 completado (servicios + hook + vistas)             |
| `src/components/ProductsComponents/PageProducts/ProductsModify/ProductsModify.jsx`         | 177    | refactor completado (21 sep 2026, rama `refactor/products-modify`) |
| `src/components/ProductsComponents/PageProducts/ProductsPromotions/ProductsPromotions.jsx` | 113    | refactor completado (23 sep 2026, rama `refactor/products-promotions-modularization`; reducido de 346 a <120 líneas) |

**Recomendación:** ver la guía de refactor incremental en `CODE_STANDARDS.md` (sección "Cómo
dividir un componente grande"). No requiere reescritura de golpe.

**Re-baseline (17 sep 2026) — rama `chore/tech-debt-foundations`:** se verificaron los conteos
reales de los componentes pendientes (`wc -l`): `RewardModal.jsx` = **1055** (no 1065),
`ProductsModify.jsx` = **640** (no 1330) y `ProductsPromotions.jsx` = **345** (no 1265). La ruta de
`ProductsModify`/`ProductsPromotions` se corrigió a
`src/components/ProductsComponents/PageProducts/` y la de `RewardModal` a
`src/components/CustomersComponents/Modals/RewardModal/`. Decisión de alcance (Fase 0): el refactor
de la Fase 3 será **solo `RewardModal.jsx`**; `ProductsModify.jsx` queda para un PR posterior y
`ProductsPromotions.jsx` (345 líneas) se marca como **no requiere refactor** (queda fuera de
alcance).

**Actualización (15 sep 2026):** refactor incremental de `CashCut.jsx` en curso (rama
`refactor/cashcut-calculation`). Fase 1 completada: se extrajeron todas las agregaciones y totales
a `src/pages/CashCut/services/cashCutCalculationService.js` (puro, con tests que fijan los totales
actuales) y el componente quedó sin `reduce` inline. Faltan las fases de servicios de datos, hooks
y vistas por sección.

**Actualización (15 sep 2026) — Fase 2:** rama `refactor/cashcut-services`. Se extrajeron todas las
consultas y escrituras de Supabase a `cashCutReportService.js` (datasets del turno + ciclo de vida
del corte) y `cashCutDetailService.js` (corte histórico bajo demanda), con 28 tests de contrato.
`CashCut.jsx` bajó a ~1747 líneas y solo conserva `supabase` para las suscripciones realtime
(que se moverán en la Fase 3 de hooks). Faltan las fases de hooks y vistas por sección.

**Actualización (15 sep 2026) — Fase 3:** rama `refactor/cashcut-hooks`. El estado, los efectos y
la suscripción realtime se movieron a `useCashCutReport.js` (página principal: carga, historial,
datasets, derivados y realtime) y `useCashCutDetail.js` (subflujos con modal: confirmar corte y
cerrar turno), con 19 tests de hook y 5 de formateadores. Los formateadores puros se extrajeron a
`utils/cashCutFormatters.js`. `CashCut.jsx` bajó a ~855 líneas y ya no importa `supabase`; queda
como composición de hooks + `AppModal` + `handlePrint` + JSX. Falta la Fase 4 (vistas por sección).

**Actualización (15 sep 2026) — Fase 4:** rama `refactor/cashcut-views`. Las secciones JSX se
extrajeron a componentes presentacionales en `src/pages/CashCut/components/` (`CutHero`,
`CutInfoSection`, `CutCashSummarySection`, `PaymentMethodsSection`, `CashInflowsSection`,
`CashOutflowsSection`, `DepartmentsSection`, `SalesSummarySection`, `RewardsSection`,
`CancellationsSection`, `PartialReturnsSection`, más `primitives.jsx` con `IconImg`/`SectionCard`/
`DataRow`/`EmptyState`). La auditoría unificó los items de cancelación y devolución parcial (casi
idénticos) en un `RefundItem` compartido. La página quedó como orquestador y reutiliza el hook
compartido `src/hooks/useAppModal.js` (antes duplicado inline). `CashCut.jsx` bajó a ~372 líneas.
Como mejora opcional futura, `CashCut.module.css` sigue siendo un único módulo compartido por las
vistas (se podría segregar por sección). Con esto se completan las fases 1-4 del refactor de
`CashCut.jsx`; quedaron como seguimiento #46 (renombrar `fetchCutsHistory`) y #47 (unificar flujos de
recarga del hook), ambos resueltos en el cierre de la Fase 3 (ver más abajo).

**Actualización (16 sep 2026) — refactor de `ticketBuilder.js`:** el generador de tickets se
descompuso en `src/utils/ticket/` (rama `refactor/ticket-builder`, salida byte-idéntica): primitivas
de layout (`ticketLayoutFormatters.js`), formateadores de fecha (`ticketDateFormatters.js`), extracción de
items (`ticketItemFormatters.js`), servicios puros de recompensas/pagos/sucursal/puntos
(`ticketRewardService.js`, `ticketPaymentService.js`, `ticketBranchFormatters.js`,
`ticketPointsService.js`), secciones (`ticketSections.js`) y `ticketBuilder.js` quedó como
orquestador que compone secciones. La salida se congeló con 14 golden tests y cada módulo tiene su
suite unitaria (109 casos en total). Los dos importadores solo cambiaron la ruta.

**Actualización (17 sep 2026) — refactor de `RewardModal.jsx`:** rama `refactor/reward-modal`. El
modal de recompensas se descompuso en `rewardModalCalculationService.js` (normalización, validación,
payloads y diffs puros), `rewardModalService.js` (consultas/mutaciones de Supabase) y
`useRewardModal.js` (estado, efectos y handlers), más dos vistas presentacionales
(`RewardDiscountFields.jsx`, `RewardProductSelector.jsx`). `RewardModal.jsx` bajó de **1055 a 280
líneas** (< 350) y ya no importa `supabase` (DIP). Tests de caracterización: 53 casos
(`rewardModalCalculationService.test.js` con 33 y `useRewardModal.test.js` con 20). La suite atrapó un
bug latente: `validateValues` dependía del estado `selectedProductIds` como default; en el servicio
puro el argumento se pasa explícito para conservar el comportamiento (exigir producto en
`free_product`).

**Pendiente de la Fase 4 (no bloqueante):** `CutHero` recibe 11 props (se podrían agrupar las de
sesión si crece); `CashInflowsSection`/`CashOutflowsSection` comparten el patrón de filas + total
(candidato a un `CashMovementCard` común, bajo valor con solo 2 usos); y las vistas presentacionales
no tienen tests (coherente con el stance del proyecto de no testear UI, ver `docs/TESTING.md`). El
módulo `CashCut.module.css` ya no tiene clases muertas, pero conserva `!important` heredados (#48).

**Pendiente de la Fase 3 (no bloqueante):** `useCashCutReport.js` (~840 líneas) concentra carga,
realtime y derivados; si crece más, conviene subdividirlo (p. ej. `useCashCutRealtime`). La auditoría
de la Fase 3 también dejó documentados (preexistentes, sin cambio de comportamiento): estado "stale"
de los totales cuando fallan los fetches secundarios de ventas, la re-escritura repetida de
`localStorage`/`shift-cut-status-changed` en cada refresh realtime con corte existente, y el
acoplamiento por `setErrorMsg` crudo entre `useCashCutReport` y `useCashCutDetail`. La duplicación de
rutas de recarga se registró aparte en #47 (resuelto, ver más abajo).

**Actualización (15 sep 2026) — cierre de la Fase 3:** se resolvieron los seguimientos del hook
(rama `refactor/cashcut-views`): #46 (wrapper local renombrado a `loadCutsHistory`, servicio
`fetchCutsHistory` importado directo) y #47 (helper `reloadCurrentView({ refreshHistory })` consumido
por mount, `refreshAfterCut`, `changeSelectedCut("current")` con `refreshHistory: false` y el
realtime; la auditoría posterior eliminó el doble `fetchSession` del realtime y preservó el
no-flicker same-session vía `resetSalesOnSessionChange`, ver #47). Sigue abierto #45 (llave de
agrupación de pagos por método en el cálculo del corte — requiere decisión de negocio).

**Actualización (21 sep 2026) — refactor de `ProductsModify.jsx`:** rama `refactor/products-modify`. El
formulario de modificación se descompuso en dos servicios dentro de `services/`:
`productModifyCalculationService.js` (puro, sin I/O: `calculateGanancia`, `roundMoney`/`roundPercent`,
`getDiscountPriceFromPercent`/`getDiscountPercentFromPrice`, `validateProductModifyForm` y los payloads
`buildProductPayload`/`buildDiscountPayload`) y `productModifyDataService.js` (DIP: `loadProductDiscountData`
y `saveProductModifications`, recibe los callbacks del contexto `useProducts` y no importa `supabase`).
Se extrajeron seis vistas presentacionales a `components/` (`ProductModifyLookup`,
`ProductModifyGeneralSection`, `ProductModifyPricingSection`, `ProductModifyInventorySection`,
`ProductModifyDiscountSection`, `ProductModifyFooter`) que comparten el mismo `ProductsModify.module.css`
y reciben `getFieldClassName`/`renderError` como props. `ProductsModify.jsx` bajó de **640 a 177 líneas**
y quedó como orquestador; los hooks delegan la validación/cálculos al servicio puro y la persistencia al
servicio de datos. Tests: **48 casos nuevos** (`productModifyCalculationService.test.js` 39 +
`productModifyDataService.test.js` 9). Sin cambios en `useProductModifyDOM.js` ni en el CSS module.

**Actualización (23 sep 2026) — refactor de `ProductsPromotions.jsx`:** rama
`refactor/products-promotions-modularization`. El orquestador de Promociones y Kits se descompuso en
cinco vistas presentacionales en `components/` (`KitFormSection`, `KitSelectedProductsSection`,
`KitActionsSection`, `KitRegisteredListSection` y `KitProductSearchModal`, este último extraído del
JSX inline de las líneas 271-343) que comparten el mismo `ProductsPromotions.module.css` y reciben
únicamente los props que consumen (ISP). `ProductsPromotions.jsx` bajó de **346 a 113 líneas**
(<120) y quedó como orquestador declarativo: consume `useProductsPromotions()` y ensambla header +
tarjetas + modales sin lógica de negocio ni imports a `supabase` (DIP). No se alteraron estilos,
hooks de negocio (`useProductsPromotions.js`, `useKitProductSearch.js`), ni el módulo CSS. Con esto
cierra el último componente de la tabla del ítem #3: **100% resuelto**.

### 4. Emojis pendientes de limpiar en el código fuente

**Estado:** resuelto (15 sep 2026) — rama `cleanup/quick-win-debt`.

Más de 20 archivos `.jsx`/`.js` contienen emojis o símbolos Unicode usados como iconos o en logs
de consola. Ejemplos notables:

- `src/pages/Settings/Settings.jsx` — emojis distintos usados como iconos de categoría
- `src/components/SalesComponents/SalesProductsTable/SalesProductsTable.jsx` — indicadores de
  color/estado con emoji
- `src/backend/bd.js` — emojis en mensajes de consola

**Regla del proyecto:** prohibido el uso de emojis en cualquier parte (ver `CODE_STANDARDS.md`,
punto 7). Reemplazar por texto plano o por un icono del catálogo propio en `ICONS.md`
(`src/assets/icons/`) — si no existe uno adecuado, preguntar antes de agregar uno nuevo.

**Resolución (15 sep 2026):** barrido completo de `src/`. Los emojis en comentarios/logs se
reemplazaron por texto plano (`SalesProductsTable.jsx`, `salesProductService.js`,
`salesTicketService.js`, `useSalesProductSearch.js`, `bd.js:18`). Los emojis de UI se sustituyeron
por `<img>` del catálogo `src/assets/icons/` en `Settings.jsx` (14), `ProductsImports.jsx` (2),
`UserList.jsx` (1) y `CashCutModal.jsx` (1). Se agregaron 8 iconos nuevos de Font Awesome Free
solid — `brush`, `ruler`, `barcode`, `display`, `database`, `rotate`, `broom`, `folder` — y se
registraron en `ICONS.md`. Verificado: `rg` no encuentra emojis en `src/`.

### 5. Transacciones Atómicas (RPC) faltantes en Supabase

**Estado:** resuelto (23 sep 2026) — rama `feature/atomic-products-import-rpc`.

**Actualización (24 ago 2026):** se confirmó por introspección directa del schema (ver `SCHEMA.md`)
que **ventas y transferencias entre sucursales ya cuentan con RPC atómica**
(`create_sale_transaction`, `create_transfer_order`, `receive_transfer_order`,
`cancel_transfer_order`, `close_cash_register_session`). No existe todavía ninguna función RPC
equivalente para Importación masiva ni para Kits de Productos — el problema descrito sigue vigente
específicamente para esos dos módulos.

**Resolución (23 sep 2026) — Kits:** migración `20260923150000_create_product_kits_rpcs.sql`
implementa RPCs atómicas (PL/pgSQL, `SECURITY DEFINER`, `SET search_path TO 'public'`) para el ciclo
de vida de Kits, reemplazando los rollbacks compensatorios de `productKitsService.js`:
`create_kit_transaction` (retorna `uuid`), `update_kit_transaction` (retorna `boolean`) y
`delete_kit_transaction` (retorna `boolean`; soft-delete del producto + kit). Cada RPC inserta
producto, kit e items, o revierte con `raise exception` tipado — ACID nativo de PostgreSQL en lugar
de transacciones compensatorias. El cliente (`createNewKitTransaction`, `updateKitTransaction`,
`softDeleteKitTransaction`) ahora invoca `supabase.rpc(...)` con payloads tipados; quedan eliminados
los bloques `try/catch` de rollback y los `console.error("ALERTA CRÍTICA...")` del frontend. El
contrato SQL cliente↔BD se verifica en `supabase/migrations/productKitsRpcsContract.test.js`.
Aplicada al remoto el 23 sep 2026 con `supabase db push` (verificado en `supabase migration list` y
por introspección: ACL de las 3 funciones sin `anon`/`public`).

**Resolución (23 sep 2026) — Importación Masiva:** migración
`20260923160000_create_products_import_rpc.sql` implementa la RPC atómica
`import_products_transaction(p_rows jsonb, p_branch_id uuid, p_all_branches jsonb) RETURNS jsonb`
(PL/pgSQL, `SECURITY DEFINER`, `SET search_path TO 'public'`) que inserta productos y su
`branch_inventory` en una sola transacción de PostgreSQL. Por cada fila inserta el producto y, si
`tracks_inventory`, el inventario de la sucursal actual (datos reales) y, para productos globales,
una fila inicial (stock 0) por cada sucursal de `p_all_branches`; cualquier error revierte todo con
`raise exception` — ACID nativo en lugar de las transacciones compensatorias del frontend.
`productsImportService.js` ya no hace `.insert()` + rollback manual: invoca
`supabase.rpc("import_products_transaction", ...)` y devuelve los conteos
(`created_products_count` / `created_inventories_count`); se eliminaron los bloques `try/catch` de
rollback y el `console.error("ALERTA CRÍTICA...")`. El contrato SQL cliente↔BD se verifica en
`supabase/migrations/productsImportRpcContract.test.js`. Con esto queda resuelto el ítem #5 completo
(Kits `20260923150000` + Importación `20260923160000`). **Aplicadas al remoto el 23 sep 2026 con
`supabase db push`** (verificado en `supabase migration list` y por introspección: ACL de las 4
funciones sin `anon`/`public`).

### 13. Roles de Supabase sin diferenciación real de permisos

**Estado:** decidido (17 sep 2026) — no se habilita RLS ni se diferencia admin vs cajero; riesgo aceptado y documentado en `PERMISSIONS.md`.

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

**Actualización (17 sep 2026):** introspección completa en `PERMISSIONS.md` — 13 tablas con RLS
activo y ~37 con RLS **deshabilitado** (incluye `products`, `customers`, `invoices`, `roles`,
`permissions`, `role_permissions`, `users`, `branches`), no solo `USING (true)`. La diferencia real
admin vs cajero hoy es inexistente salvo `user_branches`/`is_admin()`.

**Decisión (17 sep 2026):** se adopta el modelo "hardening sin habilitar RLS" (elegido con el
responsable): **no** se habilitan políticas RLS ni se exige `is_admin()` en las mutaciones
administrativas, porque activar RLS sobre ~37 tablas sin políticas rompería el acceso y el modelo
vigente es `authenticated` de confianza. Se documenta como **riesgo aceptado** en `PERMISSIONS.md`.
Como mitigación acotada, la migración `20260917200000_harden_transactional_rpcs.sql` revoca `EXECUTE`
a `anon`/`PUBLIC` en las RPCs transaccionales y fija el actor desde `auth.uid()`. Cierra #13 como
decisión (no como cambio de permisos); ver #38 y #10.

### 18. RPC de comisiones pagaba comisión por ventas canceladas (filtro `'canceled'`)

**Estado:** resuelto — migración `supabase/migrations/20260910120500_fix_commissions_status_filter.sql`,
rama `perf/report-optimization`, 10 de septiembre de 2026.

Las funciones `get_commissions_report_data` (migraciones `20260910120200` y `20260910120400`)
filtrarían `s.status != 'canceled'` (una sola "L"). El enum canónico de ventas canceladas en la app
es `'cancelled'` (`src/utils/ticket/ticketBuilder.js`, `reportsDashboardUtils.js:149`,
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

### 51. Propagación de comisión de departamento no aplicaba a productos con comisión individual propia

**Estado:** resuelto — rama `fix/department-commission-full-propagation`, 21 de septiembre de 2026.

Al actualizar la comisión de un departamento con propagación confirmada (`data.propagateToProducts`),
`updateDepartment` (`src/services/products/departmentService.js`) filtraba los `products` a actualizar
por los valores de comisión que el departamento tenía ANTES de la actualización:

```js
query = query
  .eq("commission_enabled", !!oldDept.commission_enabled)
  .eq("commission_type", oldDept.commission_type || "percent")
  .eq("commission_value", Number(oldDept.commission_value || 0));
```

Ese filtro se basaba en la comisión previa del departamento, por lo que **todo producto cuya comisión
individual difería de la anterior del departamento** (ajustada manualmente, exenta con
`commission_enabled=false`, con otro tipo o valor) quedaba fuera de la actualización masiva y
conservaba valores obsoletos tras la propagación.

**Regla de negocio corregida:**

- Al confirmar la propagación, **todos** los productos con `department_id = id` adoptan los nuevos
  valores (`commission_enabled`, `commission_type`, `commission_value`, `commission_percent`).
- Si un producto se modifica individualmente después, esa decisión individual manda **hasta la próxima
  propagación** del departamento, que vuelve a imponer la comisión del departamento sobre los productos
  del departamento.

**Resolución (21 sep 2026):** se eliminó el `select` previo de la comisión del departamento (que
quedaba como dead code) y el bloque `if (oldDept)`. La actualización masiva quedó limpia:
`supabase.from("products").update(payload).eq("department_id", id)` — un `.eq` único, sin filtros por
valores anteriores. Cobertura nueva en `src/services/products/departmentService.test.js` (11 casos):
propagación a todos los productos sin filtrar por valores previos (verifica que el único `.eq` sobre
`products` es `department_id`), `propagateToProducts=false` no toca la tabla `products`, defaults con
campos de comisión ausentes, `commission_percent` en 0 para tipo `amount` y propagación de errores
(actualización del departamento, actualización masiva y excepciones inesperadas).

### 52. Comisiones históricas de ventas mutaban retroactivamente por recálculo en vivo contra el catálogo

**Estado:** resuelto — migración `supabase/migrations/20260921170000_freeze_sale_details_commissions.sql`, rama `fix/sale-details-commission-snapshot`, 21 de septiembre de 2026.

La RPC `get_commissions_report_data` recalculaba las comisiones devengadas al vuelo mediante un `JOIN products` y `LEFT JOIN departments` contra el catálogo vivo. Si un producto o departamento cambiaba o desactivaba su comisión después de haberse cobrado una venta (p. ej., desmarcar "Genera comisión" en _Nupec Adulto 2kg_), todas las ventas históricas de ese producto pasaban retroactivamente a `commission_amount = 0` y `has_commission = false`, desapareciendo del reporte de comisiones de los cajeros.

**Principio corregido (Inmutabilidad histórica y snapshot en la venta):**

- En un POS, la comisión ganada por el cajero al momento de la venta es un hecho histórico inmutable.
- Se agregaron 4 columnas de snapshot a `public.sale_details`: `commission_enabled`, `commission_type`, `commission_value` y `commission_amount`.
- La RPC `create_sale_transaction` (sobrecarga con `p_notes`) consulta la configuración vigente en el instante de la transacción (regla #50) y congela estos valores en la inserción de cada partida en `sale_details`.
- La migración incluye un backfill histórico para ventas existentes con desactivación y reactivación segura de `trg_prevent_edit_sale_details`.
- La RPC `get_commissions_report_data` se desacopló del catálogo vivo y ahora lee directamente las columnas congeladas de `sale_details`.
- Cobertura de tests: contrato SQL en `freezeCommissionsSnapshotContract.test.js` y suites de cálculo en `commissionsCalculationService.test.js` y `commissionsReportService.test.js`.

---

## Medio

### 6. Sin migraciones SQL versionadas para Supabase

**Estado:** resuelto (17 sep 2026) — rama `chore/tech-debt-foundations`.

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

**Resolución (17 sep 2026):** se generó el baseline completo del schema `public` con
`supabase db dump --linked --schema public` (PostgreSQL 17.6 del remoto, `pg_dump` 18.6) y se
versionó como `supabase/migrations/00000000000000_remote_schema_baseline.sql` (50 tablas, 30
funciones, 31 políticas RLS; schema-only, sin datos). El version `00000000000000` es el más antiguo
a propósito: en un entorno nuevo el baseline se aplica **primero** y crea las tablas base antes de
que corran las migraciones de RPC (los cuerpos `plpgsql`/`sql` referencian esas tablas). En el
proyecto remoto ya existente se marcó como aplicado con
`supabase migration repair --status applied 00000000000000`, de modo que `supabase db push` no
intenta recrear objetos presentes y la historia local/remota queda alineada (verificado con
`supabase migration list`: 15 versiones en ambos lados). Además se versionó el script de
introspección `supabase/scripts/schema_introspection.sql` (antes ad-hoc, ver `SCHEMA.md`) y se movió
el SQL legacy de la raíz a `supabase/legacy/` para no confundirlo con las migraciones. Ver
`docs/SUPABASE_MIGRATIONS.md`.

### 7. Discrepancia README vs. dependencias reales (SQLite)

**Estado:** resuelto (18 sep 2026) — rama `cleanup/ui-and-docs`.

El `README.MD` mencionaba `better-sqlite3` como ORM, pero `package.json` usa el paquete
`sqlite3` directamente (callback-based, no el driver síncrono `better-sqlite3`). Ya reflejado
correctamente en `AGENTS.md` y `docs/SCHEMA.md`.

**Resolución (18 sep 2026):** tras la eliminación del backend local SQLite (#31/#34), el README se
actualizó por completo: se retiraron `sqlite3`, Express y CORS del stack, de los prerrequisitos y de
las dependencias; se quitó `src/backend` de la estructura del proyecto; `npm run dev` ya solo levanta
Vite + Electron y se eliminaron la fila `npm run rebuild` y la opción SQLite3 como prerrequisito.

### 8. Sin `lint` ni `test` configurados

**Estado:** resuelto (17 sep 2026) — rama `chore/tech-debt-foundations` (test desde el 9 sep; lint
completado).

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

**Resolución (17 sep 2026):** se configuró ESLint 9 (flat config `eslint.config.mjs`:
`js.configs.recommended`, `react`, `react-hooks`, `no-console` permitiendo solo `console.error`,
`no-unused-vars` como warning) y Prettier (`.prettierrc.json` con tabWidth 2, comillas dobles —
el estilo dominante del repo —, `trailingComma: es5`, fin de línea LF; `.prettierignore`), con los
scripts `npm run lint` / `npm run format` / `npm run format:check`. Para no bloquear por la deuda
heredada, el **CI** (`.github/workflows/ci.yml`, Node 20) corre ESLint y Prettier solo sobre las
líneas agregadas/modificadas del diff, además de `npm test` y `npm run build:frontend`. El repo
preexistente arrastra 684 problemas de lint (140 errores, 544 warnings) que **no** se corrigen en
esta fase; se saldan incrementalmente conforme se tocan los archivos. Ver `docs/TESTING.md`.

### 9. Falta de Unit Tests para Utilidades Puras

**Estado:** parcialmente resuelto — 9 de septiembre de 2026.

Se aisló con éxito lógica de negocio compleja en funciones puras (ej. `importUtils.js`, validaciones en `productsImportService.js` y `productKitsService.js`), pero no existían pruebas unitarias. Con la configuración de Vitest (punto 8) quedaron cubiertos los formateadores puros del catálogo (`productFormatters.js`, 13 tests: `buildDepartmentMap`, `buildInventoryProductIds`, `formatBranchKardexProducts`, `formatGlobalProductsWithoutInventory`), la suite preexistente de `useSalesTotals`, el hook global `usePagination` (10 tests) y los contratos de CRUD de productos en `productCrudService` (15 tests).

**Actualización 2 (9 sep 2026):** se agregó la cobertura de Importación y Kits con la suite en **83 tests**:

- `importUtils` (14 tests de funciones puras: `normalizeText`, `normalizeHeader`, `parseBoolean`, `parseNumber`, `formatCurrency` y catálogos de columnas).
- `productsImportService` (11 tests con `supabase` y `validateSatClaves` mockeados: validación de datos, sucursales/departamentos, creación de departamentos faltantes y `processImportTransaction` con inventario por sucursal, productos globales y rollback cuando falla la inserción de inventario).
- `productKitsService` (13 tests: `fetchKits` filtrando productos inactivos, detección de duplicados por barcode/nombre, alta con rollback, actualización restaurando items previos, baja con reversión, y lecturas de consulta).

**Actualización 3 (16 sep 2026):** se cubrió el generador de tickets durante su refactor
(`src/utils/ticket/`, rama `refactor/ticket-builder`) con **109 tests** en 9 suites: 14 golden tests
de `buildTicketText` que congelan la salida completa del ticket (incluye reimpresión, cancelación,
devoluciones parciales, kits y canjes), más unitarios por módulo: `ticketLayoutFormatters` (15, primitivas de
ancho, centrado, wrap y líneas de columnas), `ticketDateFormatters` (8, zona `America/Cancun`),
`ticketItemFormatters` (10, extracción por alias), `ticketRewardService` (16, detección/agrupación de
canjes), `ticketPaymentService` (9, método, USD y recibido/cambio), `ticketBranchFormatters` (7,
dirección y CP), `ticketPointsService` (8, saldo y devoluciones) y `ticketSections` (22, rangos de
sección, cancelaciones con puntos y devoluciones parciales). Ningún módulo toca I/O.

**Actualización 4 (17 sep 2026) — Fase 4, rama `test/coverage-gaps`:** la suite pasó a **41 archivos /
524 casos** (+94) cerrando los huecos priorizados:

- **RPC de ventas:** `salesTransactionService.test.js` (13 tests: guardas, mapeo snake_case, coerción
  numérica, notas, fecha por defecto, propagación de error y falta de id) y
  `supabase/migrations/transactionalRpcsContract.test.js` (8 tests: firma, retorno y grants de
  `create_sale_transaction` y `create_transfer_order` contra la migración, más cross-check
  cliente↔BD de nombres de parámetros).
- **Impresión y corte:** `cashCutBuilder.test.js` (38 tests: encabezado, resultado, resumen neto,
  dinero en caja, métodos, entradas/salidas, recompensas, cancelaciones/dev parciales, firmas e
  invariante de ancho fijo de 32 columnas) y `ticketPrinter.test.js` (4 tests del contrato
  éxito/fallo).
- **Proceso principal de Electron:** se extrajo `electron/mainProcess.js` (inyección de dependencias,
  sin `require('electron')`) y `main.js` quedó como wiring; `mainProcess.test.js` (31 tests) cubre
  los seis canales IPC, el zoom por `webContents` y el ciclo de vida de la ventana.
- `create_transfer_order` no tiene caller JS (la vista de traspasos es el stub de #12), por lo que su
  contrato se fija a nivel SQL.
- Hallazgo de seguridad derivado al fijar el contrato SQL: #49 (`create_sale_transaction` sin
  `search_path` fijado).

**Recomendación:** con esta capa cubierta, la siguiente deuda de testing es el backend Express/SQLite
(`src/backend/server.js` y `bd.js` requieren un desacople previo) y un smoke test de render del
renderer.

### 10. Revisión de Roles y Permisos (Supabase vs Local)

**Estado:** abierto — parcialmente documentado.

Falta confirmar si el rol `admin` en Supabase tiene roles hermanos (ej. cajero, gerente) y definir formalmente si los permisos locales de SQLite deben sincronizarse con los de Supabase, para evitar discrepancias de autorización entre entornos.

**Actualización (24 ago 2026):** se confirmó que en Supabase solo existen los roles `admin` y
`cajero` (no `gerente`). Se documentó la arquitectura completa del sistema de roles/permisos remoto
en `PERMISSIONS.md`. Sigue sin confirmarse si el sistema local de SQLite (`src/backend/bd.js`) se
sincroniza de alguna forma con este sistema remoto, o si son completamente independientes — ver
también el punto 13 de este documento.

**Actualización (17 sep 2026):** `PERMISSIONS.md` incorpora la matriz RLS revisada por introspección
(13 tablas con RLS activo, ~37 deshabilitadas) y la excepción pre-auth documentada. Sigue pendiente
la decisión del equipo sobre (a) la matriz objetivo `admin` vs `cajero` y (b) si el backend local de
SQLite se elimina en favor de Supabase Auth + RLS o se sincroniza. El detalle del gateo client-side y
sus límites está en #38.

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

**Estado:** Resuelto — 17 sep 2026, verificado con datos reales de Supabase; decisión: mantener base neta (sin cambio de código).

La RPC calcula la comisión porcentual sobre `unit_price * quantity` (monto bruto), mientras el
client legacy (`commissionsCalculationService.js:45`) la calculaba sobre `total_price` (neto de
línea). Cuando una partida tiene descuento (`discount_amount`/`ln`), las bases difieren. Además la
RPC no replica la inferencia de descuentos implícitos del legacy (diferencia `sale_price` vs
`unit_price`; `unit_price*qty` vs `total_price`) para la bandera `has_discount`.

**Impacto:** posible divergencia en montos de comisión y en el filtro "con descuento" del reporte
respecto a los resultados previos del RPC.

**Resolución:** verificado con datos reales (239 filas de `sale_details`): `unit_price * quantity`
coincide con `total_price` en **las 239 filas**, por lo que la RPC (`unit_price*qty`) y el client
(`commissionsCalculationService.js:45`, `total_price`) ya calculan la misma base neta. No hay
descuentos implícitos (`discount_amount = 0` junto con `unit_price*qty <> total_price` = 0 filas).
`unit_price` ya es el precio final (igual a `final_unit_price` en las filas con descuento) y
`original_unit_price` es el precio de lista, que nadie usa como base. Se decide mantener la base
neta actual; no requiere migración. La premisa original de diferencia bruta/neta (`sale_price` vs
`unit_price`) no existe en los datos: `sale_details` no tiene columna `sale_price`. Vinculado a
`BACKLOG.md`.

### 20. Precedencia commission_value/percent y bordes de has_commission y tipo `'percentage'`

**Estado:** Resuelto — 17 sep 2026, decisión YAGNI: no se normaliza (los bordes no ocurren en datos; sin cambio de código).

En la RPC de comisiones: la comisión % usa `COALESCE(commission_percent, commission_value, 0)`
mientras el legacy usaba `commission_value || commission_percent` (precedencia opuesta,
`commissionsCalculationService.js:18`); `has_commission` es `true` aunque el valor sea 0 (el legacy
devolvía `false` cuando `commVal <= 0`, `:27`); y el tipo `'percentage'` (sinónimo aceptado por el
legacy, `:44`) ya no se interpreta — se calcula como flat.

**Impacto:** bordes: filas marcadas comisionables con montos 0, productos con ambos campos seteados
distintos, o configurados con tipo `percentage`.

**Resolución:** verificado con datos reales (44 productos): todos tienen
`commission_type = 'percent'` y `commission_percent = commission_value`, por lo que la precedencia
opuesta resulta indistinta; no hay filas con tipo `'percentage'` ni con `commission_enabled = true`
y valor 0. `has_commission` se mantiene ligado a la configuración
(`commission_enabled OR dept_commission_enabled`), que es la semántica vigente de la RPC y coincide
con los datos. Se decide no normalizar (YAGNI) y no migrar; queda documentado como riesgo latente
para el caso de que aparezca el tipo `'percentage'`, productos con ambos campos distintos, o
`commission_enabled = true` con valor 0.

### 21. RPC de caja: CTE session_payments escanea todo el histórico sin pushdown de fecha

**Estado:** resuelto en código y aplicado al remoto — rama `perf/reports-scalability` (17 sep 2026;
`supabase db push` verificado el 23 sep 2026, presente en `supabase migration list`).

`get_cash_report_sessions` (migración `20260910120100`) agregaba `sale_payments` completos en el CTE
`session_payments` y solo acotaba por ventana de sesión en el JOIN final; no había pushdown del rango
de fechas dentro del CTE ni un índice acotado para el join por ventana.

**Impacto:** a medida que crece el histórico de pagos, el reporte de caja puede degradarse.

**Resolución (17 sep 2026) — rama `perf/reports-scalability`:** migración
`20260917210000_cash_report_session_payments_pushdown.sql` que (1) crea el índice compuesto
`idx_sale_payments_branch_created_at (branch_id, created_at)` y (2) reescribe el CTE `session_payments`
para acotar por `sp.branch_id IN (SELECT branch_id FROM filtered_sessions)` y por el rango
`MIN(opened_at)`–`MAX(COALESCE(closed_at, now()))` de las sesiones filtradas. Validado contra el remoto
con `BEGIN/ROLLBACK`: 34 filas, salida idéntica a la versión previa; `sale_payments` sin `branch_id`
ni `created_at` nulos y sin mismatches de `branch_id` respecto a `sales`. **Aplicada al remoto con
`supabase db push`** (index `idx_sale_payments_branch_created_at` verificado por introspección).

### 22. Rentabilidad: procesamiento de partidas secuencial por chunks sin concurrencia

**Estado:** resuelto — rama `perf/reports-scalability` (17 sep 2026).

`profitabilityReportService.js` recorría `sale_details` en chunks de `CHUNK_SIZE = 100` con un bucle
`for await` totalmente secuencial; con periodos grandes (decenas de miles de tickets) eso podía
implicar hasta ~1000 requests encadenados.

**Impacto:** latencia del reporte de rentabilidad en periodos largos.

**Resolución (17 sep 2026) — rama `perf/reports-scalability`:** se agregó el helper puro
`mapWithConcurrency(items, limit, mapper)` en `src/utils/asyncUtils.js` y `profitabilityReportService.js`
ahora carga `sale_details` en lotes de `SALE_DETAILS_CHUNK_SIZE = 100` con
`SALE_DETAILS_CONCURRENCY = 4` vía `fetchSaleDetailsChunk` (que aísla el fallo de un lote devolviendo
`[]`). Tests: `src/utils/asyncUtils.test.js` (límite de concurrencia y orden) y
`profitabilityReportService.test.js` (verifica 5 lotes para 450 ventas con máximo 4 en vuelo).

### 25. Agregación del reporte de inventario inline en el service sin CalculationService puro

**Estado:** resuelto — rama `perf/reports-scalability` (17 sep 2026).

`inventoryReportService.fetchInventoryReportData` agrupaba filas, calculaba KPIs/reorder/sugerencias y
construía resúmenes por departamento inline, sin `*CalculationService` puro (a diferencia de
comisiones, que sí separa `commissionsCalculationService.js`). La lógica quedaba dividida entre SQL
(estados/umbrales por fila en `get_inventory_report_data`) y JS (agregación), lo que complicaba el
testeo y reuso (SRP).

**Impacto:** mantenibilidad y cifras sujetas a duplicar criterios si el RPC cambia umbrales.

**Resolución (17 sep 2026) — rama `perf/reports-scalability`:** nuevo
`inventoryReportCalculationService.js` puro (`mapInventoryRowsToItems`, `calculateInventoryKpis`,
`buildDepartmentBreakdown`, `buildReorderSuggestions`, `buildExhaustedProducts`, `buildDepartments`)
consumido por `fetchInventoryReportData`, que conserva idéntico el contrato de retorno. Tests en
`inventoryReportCalculationService.test.js`.

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

**Estado:** Resuelto y aplicado al remoto — 17 sep 2026, migración `20260917190000_cash_register_branch_validation.sql` (rama `fix/security-hardening`; `supabase db push` verificado el 23 sep 2026).

`get_cash_register_session` y `open_cash_register` (migración `20260914120100`) son `SECURITY
DEFINER` y reciben `p_branch_id` del cliente sin verificar que el usuario autenticado pertenezca a
esa sucursal en `user_branches`. Cualquier usuario con sesión puede consultar o abrir la caja de
cualquier sucursal. Es paridad con el backend Express anterior (usaba service role y confiaba en el
`branchId` del cliente) y con la postura actual "todo autenticado es de confianza" (punto #13), pero
no escala a multi-sucursal con roles diferenciados.

**Impacto:** un cajero de la sucursal A podría abrir/consultar la caja de la sucursal B con la anon
key pública y su propia sesión.

**Resolución:** la migración `20260917190000` agrega el helper `_user_can_access_branch(p_branch_id)`
(`SECURITY DEFINER`, exento vía `is_admin()`) y lo aplica en `get_cash_register_session` y
`open_cash_register`, que ahora lanzan `42501` (`insufficient_privilege`) si el usuario autenticado no
tiene membresía activa en `user_branches` para esa sucursal. La excepción `SECURITY DEFINER` queda
documentada en `docs/SUPABASE_MIGRATIONS.md`; **aplicada al remoto el 23 sep 2026** (verificado en
`supabase migration list` y por introspección de `_user_can_access_branch`).

### 30. `get_branch_by_device` es anon + `SECURITY DEFINER` (excepción de login pre-auth)

**Estado:** Aceptado y documentado — 17 sep 2026 (excepción de login pre-auth; ver `PERMISSIONS.md` y `docs/SUPABASE_MIGRATIONS.md`).

El login debe resolver la sucursal del equipo **antes** de autenticar, por lo que la RPC
`get_branch_by_device` (migración `20260914120000`) se concede a `anon` y es `SECURITY DEFINER`
(rompe RLS). Devuelve solo `{ id, name, code }` de la sucursal activa asociada a un `device_code`,
que se genera con `crypto.randomUUID()` (`electron/main.js:20`) y por tanto no es enumerable.

**Impacto:** es la única función anon-executable que rompe RLS; con la anon key pública alguien
podría sondear `device_code` (no enumerable) o abusar del endpoint.

**Recomendación:** cuando el volumen de POS crezca, mover la resolución a una edge function con rate
limiting o a un intercambio one-time; mientras tanto, mantener el retorno mínimo y monitorear. Ver
excepción documentada en `docs/SUPABASE_MIGRATIONS.md`.

### 44. `supabase/.temp/` registrado en git (estado local del CLI)

**Estado:** resuelto (15 sep 2026) — rama `cleanup/quick-win-debt`.

`supabase/.temp/` contiene el estado local del Supabase CLI (`cli-latest`, `gotrue-version`,
`linked-project.json`, `pooler-url`, `postgres-version`, `project-ref`, `rest-version`,
`storage-migration`, `storage-version`) y sus 9 archivos estaban trackeados en git. Son archivos de
caché del CLI que cambian en cada corrida o actualización (p. ej. `cli-latest` se actualiza con cada
`db push`), por lo que generaban ruido constante en `git status` y diffs accidentales.

**Nota de seguridad:** se verificó el contenido de `pooler-url` — es una URL de conexión **sin
contraseña** (`postgresql://postgres.<project-ref>@...`), por lo que no había credenciales
expuestas. Aun así, versionar estado local del CLI no es deseable.

**Resolución (15 sep 2026):** se agregó `supabase/.temp/` a `.gitignore` y se retiraron los 9
archivos del índice con `git rm --cached -r supabase/.temp/` (se conservan en disco).

### 45. Agrupación de pagos por nombre en el cálculo del corte

**Estado:** resuelto — rama `perf/reports-scalability` (17 sep 2026).

`groupPaymentsByMethod` (extraído en la Fase 1 del refactor a
`src/pages/CashCut/services/cashCutCalculationService.js`) agrupaba los pagos por el **nombre** del
método, conservando el `id` y `affects_cash` de la primera aparición. Si existen dos métodos
distintos con el mismo nombre (p. ej. catálogos por sucursal), sus montos se fusionaban en una sola
fila y el `id` usado para el detalle del corte (`cash_cut_details`) podía no corresponder al método
real.

**Resolución (17 sep 2026) — rama `perf/reports-scalability`:** la llave de agrupación ahora es
`payment.payment_methods?.id || name` (con `name` solo como fallback para pagos sin método), vía
`Map`, conservando `name`/`affects_cash` de la primera aparición. Tests actualizados y 2 casos nuevos
en `cashCutCalculationService.test.js` (mismo nombre con `id` distinto no se fusiona; sin `id` se
agrupa por `name`).

### 49. `create_sale_transaction` es `SECURITY DEFINER` sin `search_path` fijado (SEC-5)

**Estado:** resuelto — migración `supabase/migrations/20260923130000_fix_create_sale_transaction_search_path.sql`,
rama `fix/harden-create-sale-transaction-search-path`, 23 sep 2026 (detectado el 17 sep 2026 en la
Fase 4, rama `test/coverage-gaps`).

La migración de endurecimiento `20260917200000_harden_transactional_rpcs.sql` fija
`SET search_path TO 'public'` en las funciones que reescribe (`create_transfer_order`,
`receive_transfer_order`, `cancel_transfer_order`, `get_email_by_username`), pero las tres
sobrecargas de `create_sale_transaction` quedan `SECURITY DEFINER` **sin** `search_path` fijado.

**Impacto:** en una función `SECURITY DEFINER`, un `search_path` no fijado permite que objetos creados
por un usuario en un esquema presente en el path sombreen referencias no calificadas y se ejecuten con
los privilegios del definer (vector clásico de escalada de privilegios). El test de contrato
`supabase/migrations/transactionalRpcsContract.test.js` fija la firma y los grants de la sobrecarga
efectiva y deja constancia de que `create_transfer_order` sí fija el `search_path`.

**Resolución (23 sep 2026):** la migración `20260923130000_fix_create_sale_transaction_search_path.sql`
hace `CREATE OR REPLACE` de las tres sobrecargas (9, 10 y 11 parámetros) añadiendo
`SET search_path TO 'public'` a nivel de función, preservando los cuerpos byte a byte. Los grants se
reafirman por sobrecarga: `REVOKE ALL` de `public` y `anon`, `GRANT EXECUTE` solo a `authenticated` y
`service_role`. El test de contrato `transactionalRpcsContract.test.js` lee la nueva migración y exige
el `SET search_path TO 'public'` más los grants de las tres sobrecargas (6 casos nuevos). Cuerpos
verificados idénticos a las fuentes `20260917200000` (9 y 10 parámetros) y `20260921170000`
(11 parámetros, con el congelamiento de snapshot de comisión en `sale_details`).

**Despliegue:** la migración se aplicó al remoto el 23 sep 2026 con `supabase db push`; verificado por
introspección que las 3 sobrecargas quedaron `SECURITY DEFINER`, `SET search_path TO 'public'` y ACL
solo `authenticated`/`service_role`.

### 50. Comisión de producto exento pisada por la comisión del departamento en la RPC de comisiones

**Estado:** resuelto — migración `supabase/migrations/20260921140000_fix_commissions_product_override.sql`,
rama `fix/commissions-product-override`, 21 de septiembre de 2026.

La RPC `get_commissions_report_data` implementaba un fallback en cascada:

```
CASE
  WHEN dr.commission_enabled THEN ...   (comisión de producto)
  WHEN dr.dept_commission_enabled THEN ...   (fallback que pisaba la exención)
  ELSE 0
END
```

Si un producto tenía `commission_enabled = false` y pertenecía a un departamento con comisión
habilitada (p. ej. _Nupec Adulto 2kg_ en el departamento _Nupec_), la primera condición era falsa y el
CASE saltaba a la rama del departamento, cobrando la comisión pese a la exención explícita del
producto.

**Regla corregida (precedencia producto > departamento):**

- `p.commission_enabled = true` → el producto genera su propia comisión (`commission_type` /
  `commission_value`).
- `p.commission_enabled = false` → exención total: `has_commission = false`, `commission_amount = 0`,
  `rule_label = 'Sin comision'`, sin heredar nada del departamento.
- `p.commission_enabled IS NULL` (productos sin configuración explícita) → único caso donde se hereda
  la comisión del departamento si `d.commission_enabled = true`.

Además, los campos retornados `commission_type` / `commission_value` se sincronizaron para reflejar el
origen efectivo (producto o departamento) y `rule_label` se mantiene 'Sin comision' para exentos y
formatea los valores efectivos cuando aplica.

**Impacto:** montos de comisión sobreliquidados para productos exentos cuyo departamento comisiona.

**Verificación:** la migración conserva el `RETURNS TABLE` y el `REVOKE ALL FROM public` +
`GRANT EXECUTE TO authenticated` de los RPCs de reportes. Tests de contrato en
`commissionsReportService.test.js` (fila exenta y fila con herencia de departamento) y suite unitaria
nueva en `commissionsCalculationService.test.js` (exención con prioridad sobre el depto, comisión
propia, herencia solo con `commission_enabled` null/ausente, producto sin departamento).

---

## Bajo

### 11. Icono de la app con ruta idéntica en dev/prod

**Estado:** resuelto (15 sep 2026) — verificado en el barrido de limpieza.

En `electron/main.js`, `getMainWindow()` calculaba `iconPath` con una rama `isDev ? X : X` donde
ambos casos resolvían a la misma ruta (`../icon.ico`) — el condicional no tenía efecto real. No era
un bug funcional, pero era código muerto que se podía simplificar.

**Resolución (15 sep 2026):** el condicional ya no existe; `electron/main.js:27` calcula
`iconPath` de forma directa (`path.join(__dirname, '../icon.ico')`). No requiere cambios de código.

### 12. Desarrollo de Vistas Pendientes

**Estado:** resuelto (14 sep 2026).

Las vistas base de la arquitectura ya están implementadas y enrutadas. Evidencia: `src/App.jsx:52-63`
registra `/dashboard`, `/products/*`, `/cashcut/*`, `/inventory/*`, `/invoices/*`, `/customers/*`,
`/reports/*`, `/settings` y `/profiles`, con sus páginas correspondientes en `src/pages/`
(`Inventory`, `Invoices`, `CashCut`, `Settings`, `Reports`, `Customers`, `Profiles`).

Nota: la ruta de corte de caja es `/cashcut/*` (no `/cashout`, como figuraba en este punto y en
`TEMPLATE_NUEVA_PAGINA.md`). Ver también `TEMPLATE_NUEVA_PAGINA.md`, actualizado en la misma fecha.

### 14. Usuario con dominio de correo distinto a la convención interna

**Estado:** resuelto (15 sep 2026) — rama `cleanup/quick-win-debt`.

El usuario `alexander@example.com` (rol `cajero`, activo) no sigue la convención
`@internal.crokets` que usan los otros 3 usuarios reales (`carlos`, `tristan`, `kari`). Todo indica
que es una cuenta de prueba.

**Recomendación:** confirmar con el equipo si es una cuenta de prueba y, de ser así, desactivarla
(`status = false`) o eliminarla antes de distribuir el sistema a un negocio real.

**Resolución (15 sep 2026):** se agregó la migración
`supabase/migrations/20260915120000_deactivate_test_user.sql` (idempotente) que pone
`status = false` a `alexander@example.com` solo si existe y sigue activa, y se aplicó al remoto con
`supabase db push` (verificado con `supabase migration list`).

### 17. Archivos sin salto de línea final (EOF newline)

**Estado:** resuelto (15 sep 2026) — rama `cleanup/quick-win-debt`.

`AGENTS.md` y `CODE_STANDARDS.md` exigen que todos los archivos terminen con un salto de línea final
(EOF newline), pero decenas de archivos preexistentes en `src/` no lo cumplían (p. ej.
`src/main.jsx`, `src/App.jsx`, `src/contexts/BranchContext.jsx`, `src/hooks/useEscapeKey.js`,
`src/backend/server.js`, `src/utils/ticket/ticketBuilder.js`). Durante el refactor de `ProductsContext` se
corrigió en los archivos nuevos de `src/services/products/` y en `src/contexts/ProductsContext.jsx`.

**Impacto:** diffs con ruido y advertencias de herramientas; va contra el estándar del propio repo.

**Recomendación:** normalizar con un script masivo (recorrer los archivos rastreados por git y
añadir `\n` a los que falten) en una tarea dedicada de limpieza.

**Resolución (15 sep 2026):** se normalizaron con un script masivo **279 archivos** rastreados por
git (`js/jsx/css/mjs/ts/tsx/html/json/sql/svg`, excluyendo `supabase/.temp/`) que no terminaban en
salto de línea. Verificación posterior por byte hexadecimal (`tail -c 1 | od`): **0 archivos** sin
EOF newline. Nota: una verificación previa con `tail | wc -l` había reportado falsamente 0
pendientes; la comprobación correcta es por byte final.

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

**Estado:** resuelto (18 sep 2026) — rama `cleanup/ui-and-docs` (cierre de #10/#34).

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

**Resolución (18 sep 2026):** se eliminó por completo el login legacy que quedaba. Se borraron
`src/backend/server.js`, `src/backend/bd.js`, `src/backend/password.js`, `src/backend/password.test.js`
y el archivo trackeado `src/backend/db/users.db` (un `.sqlite` en el historial, lo que además cierra
la recomendación de `AGENTS.md` de no commitear archivos de base de datos). En `package.json` se
retiraron las dependencias `bcryptjs`, `cors`, `express`, `node-fetch`, `sqlite3`; las devDependencies
`nodemon`, `electron-rebuild`, `@types/sqlite3`; el script `rebuild` y el proceso `nodemon` del script
`dev`. `npm install` sincronizó el lockfile. README, AGENTS.md y DEPLOYMENT.md reflejan el stack sin
backend local (login y caja 100 % vía RPCs de Supabase).

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

**Estado:** resuelto (18 sep 2026) — rama `cleanup/ui-and-docs`.

El tope de efectivo inicial al abrir caja vive en `app_settings`
(`cash_register.max_opening_amount`, seed `1000000`) y `open_cash_register` lo lee con fallback
seguro (migración `20260914130000`). Hoy solo se puede cambiar por SQL: falta la pantalla de
configuración (y sus grants/policies de escritura, que hoy no existen a propósito) para editarlo
desde la app.

**Impacto:** el tope es configurable a nivel dato, pero requiere acceso a la DB para modificarlo.

**Recomendación:** al construir el panel de ajustes, agregar policy de escritura para rol admin
(usar `is_admin()` / `has_permission()`) y exponer el valor vía RPC o Edge Function.

**Resolución (18 sep 2026):** se agregaron dos RPCs en la migración
`20260918120000_app_settings_cash_rpcs.sql`:

- `get_cash_max_opening_amount()` — lectura para cualquier usuario autenticado (gira sobre
  `_cash_max_opening_amount()`, con el mismo fallback seguro).
- `update_cash_max_opening_amount(p_amount numeric)` — escritura `SECURITY DEFINER` con
  `set search_path = public`, guard **server-side** `is_admin()`, validación de monto no negativo y
  `upsert` en `app_settings` registrando `updated_at` / `updated_by = auth.uid()`. Revocada a `public`
  y concedida solo a `authenticated` (mismo patrón que `open_cash_register`).

En el frontend se creó el servicio `src/pages/Settings/services/cashSettingsService.js` (con tests que
miran el contrato de las RPCs) y un panel en `src/pages/Settings/Settings.jsx` (sección "Caja", tope de
apertura) que solo se renderiza cuando `checkUserIsAdmin(user.id)` es verdadero. La RPC revalida el
rol en el servidor de todos modos, por lo que el check del panel es solo de UX.

### 34. Deuda menor de la pasada de producción (no bloqueante)

**Estado:** resuelto (18 sep 2026) — rama `cleanup/ui-and-docs` (con #31).

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

**Resolución parcial (15 sep 2026):** se limpió el emoji `✅` de `src/backend/bd.js:18` (barrido de
#4). Además se corrigió el apunte de comillas: el estilo dominante del repo **sí es comillas
dobles** (157 archivos con imports `"` frente a 11 con `'`), por lo que no hay tal desviación en
`src/services/*`; se descarta la unificación a comillas simples. Siguen abiertos los puntos del
`INSERT` muerto de `server.js` y el bcrypt síncrono, ligados a la decisión de #10/#31.

**Resolución (18 sep 2026):** el `INSERT` muerto de `server.js` y el bcrypt síncrono de
`password.js` quedaron resolutos por eliminación junto con #31 (todo el backend local desapareció,
incluida la dependencia `bcryptjs`). El apunte del bcrypt async era "si el backend local crece" y ya
no aplica.

### 35. Sesión de Supabase persistida en `localStorage`

**Estado:** aceptado con mitigación parcial (18 sep 2026) — rama `cleanup/ui-and-docs`.

`src/lib/supabaseClient.js` usa el `createClient` por defecto de `@supabase/supabase-js`, que guarda
`access_token` y `refresh_token` en `localStorage` (REACT-AUTH-001). Un XSS podría exfiltrar la
sesión. Hoy el riesgo es bajo porque no hay sinks XSS en el renderer (barrido sin
`dangerouslySetInnerHTML`/`innerHTML`/`eval`), y la CSP de producción (migración de frontend en
`vite.config.mjs`) reduce la superficie.

**Impacto:** sin sink ni CSP saltada no es explotable; es deuda de defensa en profundidad.

**Recomendación:** evaluar `storage` en memoria + PKCE, o mover la sesión a cookie `HttpOnly` cuando
exista un gateway/Edge Function que lo permita. Revisar al endurecer auth.

**Actualización (18 sep 2026):** el cliente ahora configura `createClient` con opciones de auth
explícitas: `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: false`,
`storageKey: 'sb-crokets-pos-auth-token'` y `flowType: 'pkce'`. `detectSessionInUrl: false` evita que
aparatos URL con fragmento de token se lean por accidente en `file://`; el flujo es estrictamente
`signInWithPassword` (el `flowType` pkce aplica solo si algún día se suma OAuth), y el `storageKey`
deja de depender del ref remoto del proyecto. El riesgo residual (token en `localStorage` ante un
sink XSS) se mantiene documentado y se atacará de fondo al endurecer auth.

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

**Estado:** Mitigado parcialmente — 17 sep 2026. RPCs transaccionales endurecidas; el gateo en el cliente de las mutaciones administrativas se mantiene como **riesgo aceptado** por decisión #10/#13 (ver `PR_REVIEW.md`, `docs/EDGE_FUNCTIONS.md` y `PERMISSIONS.md`).

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

**Auditoría (17 sep 2026):** el resultado por endpoint está en `PR_REVIEW.md`. Hallazgos: (1) la
autorización de `authorize-admin-action` no está ligada a la mutación — la acción la ejecuta la
sesión del operador, y las mutaciones gateadas (`cash_exit_access` → `cash_movements`,
`customers_deactivate`/`deactivate_fiscal_customer` → `customers`, `products_delete_access` →
`products`) no exigen `is_admin()` y en su mayoría corren sobre tablas con RLS deshabilitado;
(2) `reason` se descarta (el modal lo envía, pero el contrato y la función no lo reciben);
(3) `action` no se valida contra allowlist. El cierre depende de la matriz #10/#13.

**Mitigación (17 sep 2026):** decisión #10/#13 = "hardening sin habilitar RLS". Migración
`20260917200000_harden_transactional_rpcs.sql`: revoca `EXECUTE` a `anon`/`PUBLIC` en las RPCs
transaccionales (`create_sale_transaction` ×3, `cancel_sale_transaction`,
`create_partial_return_transaction`, `create_transfer_order`, `cancel_transfer_order`,
`receive_transfer_order`, `cancel_sale`, `complete_sale`) y fija `p_user_id := coalesce(auth.uid(),
p_user_id)`, eliminando el acceso anónimo y la suplantación de actor. Quedan como riesgo aceptado las
mutaciones administrativas sobre PostgREST (`cash_movements`, `customers`, `products`) y la falta de
validación/auditoría de `reason`/`action`/`targetId`; se resolverían con RLS + `has_permission()` o con
un token de autorización de un solo uso desde la edge function (ver `docs/EDGE_FUNCTIONS.md`).

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

**Estado:** Resuelto — 17 sep 2026, rama `chore/tech-debt-foundations`.

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

**Resolución (17 sep 2026):** se capturó la definición exacta del remoto con `pg_get_functiondef`
(vía Management API) y se versionó como
`supabase/migrations/20260917180000_get_email_by_username.sql`: `SECURITY DEFINER`, `STABLE`,
`search_path = public` fijo, retorna solo el email de un usuario `status = true`. Se normalizaron los
grants según la convención del repo: `REVOKE ALL ... FROM public` + `GRANT EXECUTE` a `anon` (login
pre-auth, excepción de #30), `authenticated` y `service_role`. Aplicada al remoto con
`supabase db push`; verificado por introspección que la ACL resultante es
`anon/authenticated/service_role` (sin el grant implícito a `public`) y que el cuerpo coincide.
Con esto el login puede recrearse en un entorno nuevo solo con las migraciones versionadas.

### 42. `--scroll-distance` usada pero nunca definida (marquee de productos inerte)

**Estado:** Resuelto — 15 sep 2026, rama `cleanup/quick-win-debt`.

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

**Resolución (15 sep 2026):** al inspeccionar el componente se confirmó que la clase `.marquee` y
el `@keyframes marqueeScroll` **nunca se aplicaban** — el JSX solo usa `styles.scrollText`
(`ProductsList.jsx:189`). Eran código muerto y la animación ya estaba retirada de facto. Se
eliminaron ambas reglas del módulo CSS, con lo que desaparece la variable indefinida.

### 46. Colisión de nombres `fetchCutsHistory` entre componente y servicio

**Estado:** resuelto (15 sep 2026) — commit `267d918`, rama `refactor/cashcut-reload-unify`.

Tras extraer las consultas a `src/pages/CashCut/services/cashCutReportService.js`, el componente
`CashCut.jsx` conserva un wrapper local `fetchCutsHistory` (orquesta estado y etiquetas) con el
mismo nombre que la función del servicio, resuelto por alias (`fetchCutsHistory as
fetchCutsHistoryService`). Funciona, pero dos capas distintas comparten el mismo identificador, lo
que dificulta leer el flujo y buscar referencias.

**Recomendación:** al convertir el wrapper en hook (Fase 3 del refactor), renombrar la función del
componente (p. ej. `loadCutsHistory`) o la del servicio (p. ej. `fetchShiftCutsHistory`) para que
cada capa tenga un nombre inequívoco.

**Resolución (15 sep 2026):** en `useCashCutReport.js` el wrapper local se renombró a
`loadCutsHistory` y el servicio se importa directo (`fetchCutsHistory` sin alias), eliminando la
colisión. Cobertura intacta: los tests siguen asertando `fetchCutsHistory` con `{ branchId }`.

---

### 47. Flujos de recarga duplicados en `useCashCutReport`

**Estado:** resuelto (15 sep 2026) — commit `267d918`, rama `refactor/cashcut-reload-unify`.

`useCashCutReport.js` implementa tres variantes de "recargar la vista actual": `changeSelectedCut("current")`
(líneas ~246-259), `refreshAfterCut` (~541-548) y el `refreshRealtimeData` interno del efecto realtime
(~560-596). Las tres encadenan `fetchSession` + `loadCurrentSession`, pero divergen: `refreshAfterCut`
y el realtime además refrescan el historial, mientras que `changeSelectedCut("current")` no. Es una
duplicación con riesgo de drift (una corrección en una ruta puede no aplicarse a las otras).

**Recomendación:** extraer un helper `reloadCurrentView({ refreshHistory })` y que las tres rutas lo
consuman, en la Fase 4 (vistas por sección) o en una pasada dedicada del hook.

**Resolución (15 sep 2026):** se agregó el helper `reloadCurrentView({ refreshHistory = false })` y
las cuatro rutas de recarga lo consumen: `fetchAllData` (mount, `refreshHistory: true`),
`refreshAfterCut` (`refreshHistory: true`), `changeSelectedCut("current")` (`refreshHistory: false`,
preservando que hoy no recarga historial) y `refreshRealtimeData` (que quedó en una llamada única al
helper, ver la Actualización de abajo). El callback realtime con debounce quedó cubierto por test en
`useCashCutReport.test.js`.

**Actualización (15 sep 2026) — hallazgos de la auditoría post-refactor, atendidos en la misma
rama:** el primer borrador del realtime llamaba `fetchSession()` y luego `reloadCurrentView()`
(que vuelve a llamar `fetchSession()`), un doble fetch por evento realtime (2 queries de sesión + 2
de sucursal), y el guard `if (activeSession?.id)` anulaba la rama sin-sesión del helper (quedaba dato
obsoleto si el turno se cerraba en otro dispositivo). Además, encaminar el realtime por
`loadCurrentSession` agregaba un `resetSalesState()` previo que el flujo same-session de antes no
tenía (flicker a ceros durante la cadena de fetches). Correcciones en `useCashCutReport.js`:

- El realtime ahora colapsa a una llamada única `reloadCurrentView({ refreshHistory: true,
resetSalesOnSessionChange: true })`, sin `fetchSession` duplicado y con la rama sin-sesión del
  helper de vuelta.
- `loadCurrentSession(sessionData, { resetSales = true })` y
  `reloadCurrentView({ refreshHistory, resetSales, resetSalesOnSessionChange })`: el realtime solo
  resetea ventas cuando cambia el `id` de sesión (restaura el no-flicker de la rama same-session),
  mientras mount/`refreshAfterCut`/`changeSelectedCut("current")` conservan el reset siempre.
- Cobertura nueva en `useCashCutReport.test.js`: el test realtime fija debounce (sin refresh antes de
  700 ms), un solo `fetchActiveSession` por refresh y el reset + recarga al cambiar de sesión
  (`resetSalesOnSessionChange` en el caso id distinto); se agregan los casos "realtime sin turno
  activo" y "`changeSelectedCut("current")` sin turno activo" (reset de la vista).

---

### 48. `!important` en módulos CSS (deuda de estilo transversal)

**Estado:** resuelto (18 sep 2026) — rama `cleanup/ui-and-docs`.

`AGENTS.md` prohíbe `!important` en los módulos CSS, pero persiste deuda heredada en varios archivos
(no introducida por el refactor de `CashCut`). Al cierre de la Fase 4 el módulo de la página conserva
12 ocurrencias (`src/pages/CashCut/CashCut.module.css`), y hay más repartidas por el proyecto
(`SalesHistoryModal`, `ProductsSearchModal`, `Sales`, `ProductsList`, `FiscalCustomerModal`,
`NavbarCashCut`, etc.). La mayoría provienen de overrides de tamaño/color sobre librerías de iconos.

**Recomendación:** pasada transversal de limpieza, resolviendo la especificidad con selectores más
específicos u orden de carga en lugar de `!important`. Fuera del alcance del refactor de `CashCut.jsx`.

**Resolución (18 sep 2026):** barrido completo. Las **128 ocurrencias** en **30 `*.module.css`** se
resolvieron con:

- **Selectores con prefijo de mayor especificidad** para estados: `.tableRow.selectedRow`,
  `.resultItem.selectedResult`, `.ticketItem.selectedTicket`, `.paymentMethod.paymentMethodSelected`,
  `.infoCard .statusConnected`, `.field .fieldError`, `.fieldGroup input.inputValid`, etc.
- **Anclaje por tabla** cuando el override competía con el `td` base del módulo padre:
  `.itemsTable td.textCenter`, `.salesTable td.totalCell`, `.detailTable td.emptyText`,
  `.table td.empty` y los hovers de fila (`table tbody tr.outOfStockRow:hover > td`).
- **Stripping directo** donde el orden de fuente ya garantizaba el estado (`.modernInput`/`.modernSelect`
  de `SalesHistoryModal`, `.kardex` `positive`/`negative`/`lowStock`, `.bold` de CashCut, `.actionBtn:disabled`).
- **Doble clase para ganar la cascada** en elemementos portaleados de `react-datepicker`
  (`.datePickerPopper.datePickerPopper`, `.datePickerCalendar.datePickerCalendar`) y en el detalle
  expandible del reporte de inventario (`td.detailCell` vs. el hover del padre).
- **Refactor de `IconImg`** (CashCut) a variables CSS (`--icon-size`, `--icon-filter`) para eliminar el
  `!important` sobre los estilos `inline` de los iconos (`heroStatLabel`, `cardIcon`, `cutDoneAlert`).
- **Limpieza de código muerto**: se eliminó el bloque `.recoveredDraftDiscard` (no usado en ningún JSX).

Verificado: `rg "!important" --glob "*.module.css" src` devuelve **0** resultados.

### 53. `cancel_sale_transaction` y `create_partial_return_transaction` son `SECURITY DEFINER` sin `search_path` fijado (SEC-5)

**Estado:** resuelto — migración `supabase/migrations/20260923140000_fix_cancel_and_return_search_path.sql`,
rama `fix/harden-cancel-and-return-search-path`, 23 sep 2026 (detectado el 23 sep 2026 durante la
auditoría externa de #49, rama `fix/harden-create-sale-transaction-search-path`).

`cancel_sale_transaction` y `create_partial_return_transaction` se definen como `SECURITY DEFINER`
**sin** `SET search_path` en `20260917200000_harden_transactional_rpcs.sql` (líneas 283 y 1136), la
misma clase de vector que #49: un objeto creado por el llamador en un esquema previo del path puede
sombrear referencias no calificadas dentro del cuerpo y ejecutarse con los privilegios del definer.
Ninguna migración posterior las reescribe con `search_path` fijado. Comparten dominio de negocio y
riesgo con los tres overrides de `create_sale_transaction` corregidos en #49.

**Recomendación:** crear una migración correctiva de seguimiento que haga `CREATE OR REPLACE` de
`cancel_sale_transaction` y `create_partial_return_transaction` añadiendo
`SET search_path TO 'public'` a nivel de función, preservando los cuerpos byte a byte (mismo patrón
que `20260923130000_fix_create_sale_transaction_search_path.sql`), y extender
`transactionalRpcsContract.test.js` para exigir el `search_path` en ambas.

**Resolución (23 sep 2026):** la migración `20260923140000_fix_cancel_and_return_search_path.sql`
hace `CREATE OR REPLACE` de ambas funciones (`cancel_sale_transaction` y
`create_partial_return_transaction`) añadiendo `SET search_path TO 'public'` a nivel de función,
preservando los cuerpos byte a byte desde `20260917200000_harden_transactional_rpcs.sql`. La
extracción de los cuerpos fue mecanicista (script de generación, sin transcripción manual) y se
verificó con diff normalizado y SHA-256: ambos cuerpos (entre `AS $function$` y `$function$;`) son
byte-idénticos a sus fuentes. Los grants se reafirman por función: `REVOKE ALL` de `public` y `anon`,
`GRANT EXECUTE` solo a `authenticated` y `service_role`. El test de contrato
`transactionalRpcsContract.test.js` lee la nueva migración y exige el `SET search_path TO 'public'`
más los grants de ambas funciones (4 casos nuevos). Con esto se cierra al 100% la familia de vectores
SEC-5 en todos los procedimientos almacenados transaccionales de venta del proyecto.

**Despliegue:** la migración se aplicó al remoto el 23 sep 2026 con `supabase db push`; verificado por
introspección que ambas funciones quedaron `SECURITY DEFINER`, `SET search_path TO 'public'` y ACL
solo `authenticated`/`service_role`.

---

## Cómo usar este documento

- Al encontrar un problema nuevo durante el desarrollo, agregarlo aquí con severidad y una
  descripción breve de impacto — no dejarlo solo como comentario perdido en el código.
- Al resolver un pendiente, no borrarlo: cambiar su `Estado` a **Resuelto** y agregar la fecha o el
  commit/PR que lo corrigió, para mantener historial de qué se ha ido arreglando.
- Los ítems nuevos se numeran de forma consecutiva al final (no se renumeran los existentes), para
  que las referencias cruzadas desde `BACKLOG.md` y otros documentos no queden rotas.
