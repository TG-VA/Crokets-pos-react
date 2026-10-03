# BACKLOG.md — Roadmap y Priorización

Vista resumida y priorizada de las tareas pendientes del proyecto **CROKETS POS**, pensada para
planeación rápida. La descripción técnica completa, el estado y el impacto de cada punto viven en
`KNOWN_ISSUES.md` — este documento **no duplica esa información**, solo la ordena por prioridad de
ejecución. Al resolver un ítem, actualizar primero `KNOWN_ISSUES.md` (cambiar su Estado a
**Resuelto**) y luego marcar el checkbox aquí.

## Prioridad Crítica (Bloqueantes de Producción)

- [x] Backend embebido no arranca en producción — ver `KNOWN_ISSUES.md` #1
- [x] Contraseña de admin local en texto plano — ver `KNOWN_ISSUES.md` #2
- [x] `useProductsList` con doble declaración de `usePagination` rompía `npm run build:frontend` — ver `KNOWN_ISSUES.md` #43

## Prioridad Alta (Arquitectura y Backend)

- [x] Componentes "dios" pendientes de refactor — **todos modularizados** (`CashCut.jsx`, `ticketBuilder.js`, `RewardModal.jsx`, `ProductsModify.jsx` y `ProductsPromotions.jsx` resueltos; este último el 23 sep 2026 en rama `refactor/products-promotions-modularization`); ver `KNOWN_ISSUES.md` #3
- [x] Emojis pendientes de limpiar en código fuente (`Settings.jsx`, `SalesProductsTable.jsx`, `bd.js`) — ver `KNOWN_ISSUES.md` #4
- [x] Transacciones atómicas (RPC) faltantes en Supabase — **Kits** (`create/update/delete_kit_transaction`, `20260923150000`) e **Importación Masiva** (`import_products_transaction`, `20260923160000`) resueltos; ver `KNOWN_ISSUES.md` #5
- [x] RPC de comisiones: excluir ventas canceladas (`'cancelled'`/`'cancelada'`) — ver `KNOWN_ISSUES.md` #18
- [x] Verificar con datos reales la base de la comisión % — resuelto: RPC y client ya coinciden en el neto `unit_price*qty` (`= total_price`) y los bordes de #20 no ocurren en datos (YAGNI); ver `KNOWN_ISSUES.md` #19 y #20
- [x] Precedencia de comisión de producto sobre departamento (exención con `commission_enabled=false`) — migración `20260921140000`, aplicada al remoto; ver `KNOWN_ISSUES.md` #50
- [x] Validación de membresía de sucursal en las RPCs de caja (`get_cash_register_session`/`open_cash_register`) — migración `20260917190000`, aplicada al remoto; ver `KNOWN_ISSUES.md` #29
- [x] Documentar la excepción pre-auth de `get_branch_by_device` (anon + `SECURITY DEFINER`) — ver `KNOWN_ISSUES.md` #30, `PERMISSIONS.md` y `docs/SUPABASE_MIGRATIONS.md`
- [x] Endurecer RPCs transaccionales (SEC-3): revocar `EXECUTE` a `anon`/`PUBLIC` y derivar `p_user_id` de `auth.uid()` — migración `20260917200000`, aplicada al remoto; el gateo de mutaciones admin en el cliente queda como riesgo aceptado por decisión #10/#13; ver `KNOWN_ISSUES.md` #38, `PR_REVIEW.md` y `docs/EDGE_FUNCTIONS.md`
- [x] Propagar la comisión del departamento a **todos** sus productos al confirmar propagación (sin filtrar por la comisión previa del departamento; las decisiones individuales de producto mandan solo hasta la próxima propagación) — ver `KNOWN_ISSUES.md` #51
- [x] Congelar comisiones en la venta (`sale_details`) y desacoplar el reporte del catálogo vivo — migración `20260921170000`, ver `KNOWN_ISSUES.md` #52 y `SCHEMA.md`
- [x] Modularizar componentes monolíticos y desacoplar DIP en el módulo de Clientes (`Customers`) — ver `KNOWN_ISSUES.md` #54
- [x] Modularizar componentes monolíticos y desacoplar DIP en el módulo de Facturación (`Invoices`) — resuelto (28 sep 2026, rama `refactor/invoices-modularization-and-dip`): 16 servicios, 6 hooks y 25 subcomponentes; 6 monolitos de 374-884 líneas reducidos a padres de 79-151; módulo de 9 a 0 errores de ESLint; suite en 81 archivos / 1225 tests; ver `KNOWN_ISSUES.md` #55
- [x] Valuación de inventario con Costo Promedio Ponderado (CPP) y congelamiento de costo histórico en ventas — **resuelto en sus tres fases (2 oct 2026)**: **Fase 1** (migración `20261002124615`, aplicada al remoto) agrega el snapshot de `sale_details.cost_price` y las columnas `unit_cost`/`total_cost` en `inventory_movements`; **Fase 2** (`feature/cpp-fase-2-servicios-y-calculo`) calcula y persiste el CPP móvil con redondeo canónico y protege las altas que no son compras; **Fase 3** (`feature/cpp-fase-3-ui-y-rentabilidad`) agrega la captura de costo de compra con CPP proyectado en vivo al alta de inventario y hace que el reporte de rentabilidad consuma el snapshot congelado, respetando R1 (kits por suma de componentes) y con fallback etiquetado para el histórico sin backfill. Ver `KNOWN_ISSUES.md` #62 y `SCHEMA.md`

## Prioridad Media (Infraestructura y Testing)

- [x] Configurar entorno de testing (Vitest + jsdom, `npm test`) — ver `KNOWN_ISSUES.md` #8
- [x] Configurar linter (ESLint 9 + Prettier) con CI incremental sobre el diff — ver `KNOWN_ISSUES.md` #8
- [x] Corregir errores críticos de ESLint y React 19 (`no-unsafe-finally`, refs en render y constantes) — **cerrado (28 sep 2026, rama `fix/react-hooks-and-eslint-zero-errors`)**. Los cinco puntos quedan resueltos y `npx eslint .` deja el repositorio en 0 errores: `react-hooks/set-state-in-effect` baja de 52 a 0, más los 4 `no-useless-escape`, 2 `no-undef` y 11 `preserve-manual-memoization` corregidos en la misma rama. Validado con `npm test` (1237 tests) y `npm run build:frontend` — ver `KNOWN_ISSUES.md` #56
- [x] Unit tests para utilidades puras restantes — `importUtils`, `productsImportService` y `productKitsService` cubiertos (suite total en 83 tests con `productFormatters`, `usePagination`, `productCrudService` y `useSalesTotals`) — ver `KNOWN_ISSUES.md` #9
- [x] Cerrar huecos de testing: contrato de RPCs de ventas (`create_sale_transaction` mock + firma SQL de `create_transfer_order`), `cashCutBuilder.js`, `ticketPrinter.js` y proceso principal de Electron (`electron/mainProcess.js`) — suite en 41 archivos / 524 tests; ver `KNOWN_ISSUES.md` #9
- [x] Smoke test de render del renderer (`src/App.test.jsx`) — resuelto (1 oct 2026, rama `test/renderer-smoke-tests`): **15 tests** que montan el árbol real de `src/main.jsx` contra Supabase y Electron simulados y fijan el montaje en frío (`LoadingScreen` → `/login`), las guardas de `AuthGuard` (sin caja, con caja, `requireNoCashRegister`, `isLocked`), la ruta raíz, el wildcard y la resiliencia de `useResponsiveScale` sin `window.electronAPI`. `AppRoutes` pasó a named export con prop `RouterComponent` inyectable para poder usar `MemoryRouter` en tests; la producción sigue con `HashRouter`. Suite en 85 archivos / 1,293 tests; ver `KNOWN_ISSUES.md` #9 y `docs/TESTING.md`
- [x] Migraciones SQL versionadas para el schema de Supabase (baseline `00000000000000_remote_schema_baseline.sql` marcado como aplicado; SQL legacy movido a `supabase/legacy/`; script de introspección versionado) — ver `KNOWN_ISSUES.md` #6
- [x] Revisar roles y permisos Supabase vs SQLite local — decisión: "hardening sin habilitar RLS" (sin diferenciación admin vs cajero; riesgo aceptado). Queda pendiente decidir el futuro del backend SQLite legacy; ver `KNOWN_ISSUES.md` #10 y #13, `PERMISSIONS.md`
- [x] Migrar tablas de reportes al hook global `usePagination` (client-side, server-side Sales e híbrido Cash completo) — ver `KNOWN_ISSUES.md` #15
- [x] Extraer componente compartido `PaginationBar` y eliminar los footers de paginación duplicados — ver `KNOWN_ISSUES.md` #15
- [x] Migrar lista de productos a paginación server-side (RPC `get_branch_products_paginated`; `useProductsList` desacoplado de `ProductsContext`) — ver `KNOWN_ISSUES.md` #16
- [x] Refactor de `ProductsContext`: extraer lógica de datos/CRUD a `src/services/products/` y optimizar realtime — ver `KNOWN_ISSUES.md` #16
- [x] Acotar el CTE `session_payments` por rango de fechas + índice compuesto en `sale_payments` para el reporte de caja (migración `20260917210000`, aplicada al remoto) — ver `KNOWN_ISSUES.md` #21
- [x] Concurrencia acotada en el procesamiento de partidas de rentabilidad (chunks paralelos o RPC) — ver `KNOWN_ISSUES.md` #22
- [x] Extraer `inventoryReportCalculationService.js` puro (agregaciones del reporte de inventario) — ver `KNOWN_ISSUES.md` #25
- [x] Revocar `EXECUTE` a `anon` en el RPC base `get_branch_products_paginated` (hardening de grants; reports ya corregidos) — ver `KNOWN_ISSUES.md` #26
- [x] Consolidar el guard de autorización de administrador duplicado en un `ProtectedRoute` compartido (Pages Reports/Products/Invoices) y eliminar rutas/hook protegidos duplicados — ver `KNOWN_ISSUES.md` #28
- [x] Interceptar la navegación protegida en los navbars de módulo (hook `useProtectedNavigation` + config `adminProtectedSections`) para no cambiar de URL antes de autorizar — ver `KNOWN_ISSUES.md` #27
- [x] Compartir la autorización entre navbar y guard vía el Set `authorizedRoutes` por montaje de módulo (una sola autorización; las páginas derivan sus rutas de `adminProtectedSections`) — ver `KNOWN_ISSUES.md` #27
- [x] Definir la llave de agrupación de pagos por método (por `id`, no solo por nombre) en el corte de caja — ver `KNOWN_ISSUES.md` #45
- [x] Unificar los flujos de recarga de la vista actual de `useCashCutReport` (`changeSelectedCut("current")`, `refreshAfterCut` y realtime) en un helper común — ver `KNOWN_ISSUES.md` #47
- [x] Panel de configuración del tope de apertura de caja con RPCs admin (`get_cash_max_opening_amount` / `update_cash_max_opening_amount`, migración `20260918120000`, aplicada al remoto; panel de ajustes pendiente) — ver `KNOWN_ISSUES.md` #33
- [ ] Endurecer la persistencia de sesión de Supabase (storage en memoria / cookie HttpOnly) cuando exista gateway o Edge Function — ver `KNOWN_ISSUES.md` #35
- [x] Fijar `search_path` en las sobrecargas de `create_sale_transaction` (`SECURITY DEFINER`) — ver `KNOWN_ISSUES.md` #49
- [x] Fijar `search_path` en `cancel_sale_transaction` y `create_partial_return_transaction` (`SECURITY DEFINER`, cierre total de la familia SEC-5) — ver `KNOWN_ISSUES.md` #53
- [x] Desacoplar `src/backend/server.js` y `bd.js` — resuelto por eliminación total del backend local SQLite (18 sep 2026, rama `cleanup/ui-and-docs`); ver `KNOWN_ISSUES.md` #31
- [x] Implementar la impresión real de tickets (canal IPC `print-ticket`) y restituir el contrato `{ success, message, error }` en los tres llamadores — resuelto (29 sep 2026, rama `feature/ticket-printer-ipc-setup`): servicio de impresión con perfiles 58/80 mm en el proceso principal, `printTicket` sobre IPC y suite en 84 archivos / 1278 tests; queda parametrizar la impresora física por sucursal cuando exista el hardware; ver `KNOWN_ISSUES.md` #59
- [x] Corregir los pasos incrementales de ESLint y Prettier en CI, que no ejecutan nada porque `rg` no está en el runner — resuelto (29 sep 2026, rama `fix/ci-eslint-and-modal-icons`): `rg` sustituido por `grep -E` en ambos pasos y `react/jsx-uses-vars` activado en el flat config (564 → 187 warnings de `no-unused-vars`); queda la deuda de formato, que es de 355 archivos y no de tres — ver `KNOWN_ISSUES.md` #60 y #61

## Prioridad Baja (Limpieza y Convenciones)

- [x] Eliminar declaraciones residuales de `console.log` en código de producción — cero `console.log`/`console.warn` en `src/` (25 sep 2026, rama `fix/code-quality-and-runtime-bugs`) — ver `KNOWN_ISSUES.md` #57
- [x] Reemplazar caracteres tipográficos (`✓`, `✕`) por iconos SVG estandarizados — cierre total (29 sep 2026, rama `fix/ci-eslint-and-modal-icons`): 12 ocurrencias sustituidas por `xmark-solid-full.svg` y `circle-check-solid-full.svg` (25 sep 2026) y los pseudo-iconos `i` y `!` de `AppModal.jsx` por `circle-info-solid-full.svg` y `triangle-exclamation-solid-full.svg`, pintados con máscara y `currentColor` para heredar el color exacto de cada estado (ΔE00 = 0.00 verificado en Chromium) — ver `KNOWN_ISSUES.md` #58
- [x] Formatear los archivos que incumplen Prettier y bloquearán el paso incremental del CI al tocarse — resuelto (29 sep 2026, rama `style/global-prettier-format`): barrida global con `npx prettier --write .`, **370 archivos reformateados** (195 `.js`, 131 `.jsx`, 27 `.css`, 14 `.md`, 1 `.mjs`, 1 `.html`, 1 `.MD`; 355 de ellos matchean el filtro del CI), incluidos los tres más probables (`electron/preload.js`, `salesTicketService.js`, `useSalesHistory.js`). El reformateo quedó aislado en un commit `style:` exclusivo y verificado por comparación de AST (327 de 327 archivos JS/JSX con AST idéntico, sin cambios de lógica, imports ni contratos); `npx prettier --check .` en 0 incidencias, `npm test` 84 archivos / 1,278 tests en verde, `npm run build:frontend` EXIT 0, `npx eslint .` 0 errores y `git diff --check` limpio — ver `KNOWN_ISSUES.md` #61
