# TESTING.md — Cómo correr y escribir tests

## Runner

- **Vitest 5** con entorno `jsdom` y `globals` habilitado (`vitest.config.js`).
- Comando: **`npm test`** (equivale a `vitest run`, ejecución única sin watch).
- Para modo watch durante el desarrollo: `npx vitest`.

## Ubicación de los tests

Los tests se colocan **junto al archivo que prueban**, con sufijo `.test.js` (o `.test.jsx` para
componentes). No hay carpeta central de tests.

## Cobertura actual (21 nov 2026)

380 archivos de test (**3737 casos**) concentrados en utilidades puras, contratos de servicios, hooks
y el proceso principal de Electron:

| Área                                                      | Archivo                                                                            |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Formatters de producto                                    | `src/services/products/productFormatters.test.js`                                  |
| CRUD de productos                                         | `src/services/products/productCrudService.test.js`                                 |
| Lista de productos (paginacion server-side y teclado)     | `.../PageProducts/ProductsList/hooks/useProductsList.test.js`                      |
| Importación de productos                                  | `.../ProductsImport/services/productsImportService.test.js`                        |
| Contrato SQL de importacion solo admin                    | `supabase/migrations/importProductsAdminOnlyCurrentBranchContract.test.js`         |
| Contrato SQL de importacion sin service_role              | `supabase/migrations/importProductsRevokeServiceRoleContract.test.js`              |
| Utilidades de importación                                 | `.../ProductsImport/utils/importUtils.test.js`                                     |
| Importación: cálculo de filas y resumen (puro)            | `.../ProductsImport/services/productsImportCalculationService.test.js`             |
| Importación (validación y departamento inactivo)          | `.../ProductsImport/hooks/useProductsImport.test.js`                               |
| Importación de productos (aviso y tarjeta de inactivos)   | `.../ProductsImport/ProductsImports.test.jsx`                                      |
| Importación: inventario sigue el status (contrato SQL)    | `.../migrations/importProductsInventoryFollowsStatusContract.test.js`              |
| is_admin con search_path fijo (contrato SQL)              | `.../migrations/isAdminFixedSearchPathContract.test.js`                            |
| Importación: descriptores de instrucciones                | `.../ProductsImport/utils/importInstructionsConfig.test.js`                        |
| Importación: límite de tamaño de archivo (hook)           | `.../ProductsImport/hooks/useProductsImport.test.js`                               |
| Importación: instrucciones (chips, reglas y valores)      | `.../ImportInstructions/ImportInstructions.test.jsx`                               |
| Importación: página con instrucciones cableadas           | `.../ProductsImport/ProductsImports.test.jsx`                                      |
| Kits / promociones                                        | `.../ProductsPromotions/services/productKitsService.test.js`                       |
| Kits (filtro por estado y texto, sin acentos)             | `.../ProductsPromotions/services/kitsFilterService.test.js`                        |
| Kits (lista, paginacion y filtros)                        | `.../ProductsPromotions/hooks/useKitsList.test.js`                                 |
| Kits (busqueda, ya agregados y alerta de cobertura)       | `.../ProductsPromotions/hooks/useKitProductSearch.test.js`                         |
| Kits (cobertura por sucursal)                             | `.../ProductsPromotions/services/kitBranchCoverageCalculationService.test.js`      |
| Kits (sanitizado de entradas)                             | `.../ProductsPromotions/services/kitInputSanitizers.test.js`                       |
| Kits (vigencia por fechas y por vencer)                   | `.../ProductsPromotions/services/kitValidityCalculationService.test.js`            |
| Kits (orden de la lista)                                  | `.../ProductsPromotions/services/kitsSortService.test.js`                          |
| Kits (advertencia de margen)                              | `.../ProductsPromotions/services/kitMarginCalculationService.test.js`              |
| Kits (palabra de confirmacion de borrado)                 | `.../ProductsPromotions/services/kitDeleteConfirmationCalculationService.test.js`  |
| Kits (validacion del formulario)                          | `.../ProductsPromotions/services/kitFormValidationService.test.js`                 |
| Kits (completitud del formulario)                         | `.../ProductsPromotions/services/kitFormCompletenessService.test.js`               |
| Kits (cambios sin guardar)                                | `.../ProductsPromotions/services/kitFormChangesService.test.js`                    |
| Kits (estado del formulario)                              | `.../ProductsPromotions/hooks/useKitForm.test.js`                                  |
| Kits (renovar vigencia y borrado confirmado)              | `.../ProductsPromotions/hooks/useKitListActions.test.js`                           |
| Kits (lista: por vencer, renovar y gateo por rol)         | `.../ProductsPromotions/components/KitRegisteredListSection.test.jsx`              |
| Kits (modal de borrado con ELIMINAR)                      | `.../ProductsPromotions/components/KitDeleteConfirmModal.test.jsx`                 |
| Kits (acciones del formulario)                            | `.../ProductsPromotions/components/KitActionsSection.test.jsx`                     |
| Kits (pagina, aviso y props estables del buscador)        | `.../ProductsPromotions/ProductsPromotions.test.jsx`                               |
| Rol administrador en interfaz (no es seguridad)           | `src/hooks/useIsAdmin.test.js`                                                     |
| Reporte de caja                                           | `.../PageCashReport/services/cashReportService.test.js`                            |
| Reporte de caja (hook y filtro de sucursal)               | `.../PageCashReport/hooks/useCashReport.test.js`                                   |
| Reporte de comisiones                                     | `.../PageCommissionsReport/services/commissionsReportService.test.js`              |
| Reporte de productos (consulta y sucursal "ALL")          | `.../PageProductsReport/services/productReportsService.test.js`                    |
| Reporte de productos (selector desacoplado)               | `.../PageProductsReport/PageProductsReport.test.jsx`                               |
| Reporte de clientes (consulta y sucursal "ALL")           | `.../PageCustomersReport/services/customersReportService.test.js`                  |
| Reporte de clientes (selector desacoplado)                | `.../PageCustomersReport/PageCustomersReport.test.jsx`                             |
| Reporte de inventario (selector y url)                    | `.../PageInventoryReport/PageInventoryReport.test.jsx`                             |
| Reporte de rentabilidad (selector y reset)                | `.../PageProfitabilityReport/PageProfitabilityReport.test.jsx`                     |
| Reporte de rentabilidad                                   | `.../PageProfitabilityReport/services/profitabilityReportService.test.js`          |
| Reporte de inventario (datos)                             | `.../PageInventoryReport/services/inventoryReportService.test.js`                  |
| Reporte de inventario (cálculos)                          | `.../PageInventoryReport/services/inventoryReportCalculationService.test.js`       |
| Inventario: alta vía RPC transaccional                    | `.../PageAdd/services/inventoryAddService.test.js`                                 |
| Inventario: contrato SQL del alta transaccional y CPP     | `supabase/migrations/addInventoryEntryContract.test.js`                            |
| Inventario: Agregar protegido por administrador           | `.../NavbarInventory/NavbarInventory.test.jsx`                                     |
| Inventario: índice y URL directa de Agregar/Ajustes       | `src/pages/Inventory/Inventory.test.jsx`                                           |
| Inventario: mensaje de CPP al agregar (redondeado)        | `.../PageAdd/utils/inventoryAddFormatters.test.js`                                 |
| Inventario: ajuste por RPC, sin costo y hints traducidos  | `.../PageAdjustments/services/inventoryAdjustmentService.test.js`                  |
| Contrato SQL del ajuste: guarda, lock, CPP, hints y grant | `supabase/migrations/applyInventoryAdjustmentContract.test.js`                     |
| Precio de sucursal en 0 cae al catalogo                   | `src/utils/branchSalePrice.test.js`                                                |
| Contrato SQL de precio 0 por sucursal                     | `supabase/migrations/branchProductsZeroPriceContract.test.js`                      |
| Contrato SQL de RLS y escritura admin en branches         | `supabase/migrations/branchesRlsAdminWriteContract.test.js`                        |
| Contrato SQL de escritura admin en usuarios y roles       | `supabase/migrations/usersRolesWriteAdminOnlyContract.test.js`                     |
| Contrato SQL de username insensible a mayusculas          | `supabase/migrations/usersUsernameCaseInsensitiveContract.test.js`                 |
| Contrato SQL del CHECK de username en minusculas          | `supabase/migrations/usersUsernameLowercaseCheckContract.test.js`                  |
| Contrato de authorize-admin-action (username)             | `supabase/functions/authorizeAdminActionUsernameContract.test.js`                  |
| Contrato de authorize-admin-action (grant de inventario)  | `supabase/functions/authorizeAdminActionGrantContract.test.js`                     |
| Contrato SQL del alta: admin o grant y hint del rechazo   | `supabase/migrations/addInventoryEntryAdminGrantContract.test.js`                  |
| Contrato de admin-create-user (username)                  | `supabase/functions/adminCreateUserUsernameContract.test.js`                       |
| Normalizacion de username (helper compartido)             | `supabase/functions/normalizeUsername.test.js`                                     |
| Inventario: cálculo del CPP móvil                         | `src/services/inventory/inventoryCostCalculationService.test.js`                   |
| Inventario: proyección de CPP en interfaz                 | `.../PageAdd/services/inventoryAddProjectionService.test.js`                       |
| Inventario: hook de captura de costo                      | `.../PageAdd/hooks/useInventoryAddCost.test.js`                                    |
| Inventario: reautorización al vencer el grant             | `.../PageAdd/hooks/useInventoryAdd.test.js`                                        |
| Inventario: modal de reautorización cableado en Agregar   | `.../PageAdd/PageAdd.test.jsx`                                                     |
| Inventario: componente de captura de costo                | `.../PageAdd/components/InventoryAddCostEntry.test.jsx`                            |
| Inventario: movimientos (payload de costo)                | `src/utils/inventoryMovements.test.js`                                             |
| Corte de cajero (cálculos)                                | `src/pages/CashCut/services/cashCutCalculationService.test.js`                     |
| Corte de cajero (servicios de datos)                      | `src/pages/CashCut/services/cashCutReportService.test.js`                          |
| Corte de cajero (detalle histórico)                       | `src/pages/CashCut/services/cashCutDetailService.test.js`                          |
| Corte de cajero (hook principal)                          | `src/pages/CashCut/hooks/useCashCutReport.test.js`                                 |
| Corte de cajero (hook de modales)                         | `src/pages/CashCut/hooks/useCashCutDetail.test.js`                                 |
| Corte de cajero (formateadores)                           | `src/pages/CashCut/utils/cashCutFormatters.test.js`                                |
| Corte impreso (builder de ancho fijo)                     | `src/utils/cashCutBuilder.test.js`                                                 |
| Ticket: generación e impresión                            | `src/utils/ticketPrinter.test.js`                                                  |
| Modal de recompensas (cálculos)                           | `.../RewardModal/rewardModalCalculationService.test.js`                            |
| Modal de recompensas (hook)                               | `.../RewardModal/useRewardModal.test.js`                                           |
| Totales de venta                                          | `.../SalesComponents/hooks/test/useSalesTotals.test.js`                            |
| Venta transaccional (RPC)                                 | `.../SalesComponents/services/salesTransactionService.test.js`                     |
| Contrato SQL de RPCs transaccionales                      | `supabase/migrations/transactionalRpcsContract.test.js`                            |
| Contrato SQL del snapshot de costo de venta               | `supabase/migrations/costSnapshotContract.test.js`                                 |
| Proceso principal de Electron                             | `electron/mainProcess.test.js`                                                     |
| Impresión de tickets (proceso principal)                  | `electron/ticketPrintService.test.js`                                              |
| Utilidades async                                          | `src/utils/asyncUtils.test.js`                                                     |
| Paginación global (incluye reset por `resetKeys`)         | `src/hooks/usePagination.test.js`                                                  |
| Reporte de inventario: paginacion y reset al filtrar      | `.../PageInventory/PageReport/PageReport.test.jsx`                                 |
| Reporte de inventario: RPC sin tope, mapeo, D1 y D2       | `.../PageReport/services/inventoryReportService.test.js`                           |
| Reporte de inventario: estado, conteos, filtro y orden    | `.../PageReport/services/inventoryReportCalculationService.test.js`                |
| Reporte de inventario: servicio Realtime                  | `.../PageReport/services/inventoryReportRealtimeService.test.js`                   |
| Realtime: relevancia, incluye filas sin registro          | `.../PageReport/utils/inventoryReportRealtimeFilters.test.js`                      |
| Reporte de inventario: formateadores                      | `.../PageReport/utils/inventoryReportFormatters.test.js`                           |
| Reporte de inventario: exportación (columna de estado)    | `.../PageReport/utils/exportInventoryReport.test.js`                               |
| Reporte de inventario: carga, Realtime y error            | `.../PageReport/hooks/useInventoryReport.test.js`                                  |
| Reporte de inventario: contrato del RPC                   | `supabase/migrations/getBranchInventoryReportContract.test.js`                     |
| Reporte de movimientos: contrato de indices por fecha     | `supabase/migrations/movementsReportWindowIdxContract.test.js`                     |
| Reporte de movimientos: reset por filtro, sucursal, fecha | `.../PageMovementsReport/PageMovementsReport.test.jsx`                             |
| Reporte de movimientos: periodo, lotes, cursor y cache    | `.../PageMovementsReport/services/movementsReportService.test.js`                  |
| Reporte de movimientos: KPIs sin SIN STOCK y filas        | `.../PageMovementsReport/services/movementsCalculationService.test.js`             |
| Reporte de movimientos: suscripcion realtime              | `.../PageMovementsReport/services/movementsRealtimeService.test.js`                |
| Reporte de movimientos: recarga y respuestas obsoletas    | `.../PageMovementsReport/hooks/useMovementsReport.test.js`                         |
| Reporte de movimientos: sondeo de respaldo y limpieza     | `.../PageMovementsReport/hooks/useMovementsRealtime.test.js`                       |
| Reporte de movimientos: filtros por faceta y rango        | `.../PageMovementsReport/hooks/useMovementsFilters.test.js`                        |
| Reporte de movimientos: anchos de columna                 | `.../PageMovementsReport/hooks/useResizableColumns.test.js`                        |
| Reporte de movimientos: fechas, zona y presets            | `.../PageMovementsReport/utils/movementDateUtils.test.js`                          |
| Reporte de movimientos: exportacion a Excel               | `.../PageMovementsReport/utils/movementsExportUtils.test.js`                       |
| Reporte de movimientos: tarjetas de KPIs                  | `.../PageMovementsReport/components/MovementsKpiCards.test.jsx`                    |
| Navegación protegida                                      | `src/hooks/useProtectedNavigation.test.js`                                         |
| Secciones protegidas                                      | `src/config/adminProtectedSections.test.js`                                        |
| Guard de rutas                                            | `src/components/ProtectedRoute/ProtectedRoute.test.jsx`                            |
| Login: Enter en usuario avanza a contraseña               | `src/pages/Login/Login.test.jsx`                                                   |
| Sucursal por dispositivo (RPC)                            | `src/services/deviceBranchService.test.js`                                         |
| Alcance de sucursales (consultas)                         | `src/services/branchScopeService.test.js`                                          |
| Alcance de sucursales (origen de stock)                   | `src/services/branchScopeCalculationService.test.js`                               |
| Contrato SQL de branches.branch_type                      | `supabase/migrations/branchesBranchTypeContract.test.js`                           |
| Contrato SQL de create_branch con tipo                    | `supabase/migrations/createBranchBranchTypeContract.test.js`                       |
| Contrato SQL: sucursal admin sin stock                    | `supabase/migrations/rejectAdminBranchStockContract.test.js`                       |
| Acceso por tipo de sucursal                               | `src/lib/permissionsService.test.js`                                               |
| Guard de rutas por tipo de sucursal                       | `src/components/AuthGuard/AuthGuard.test.jsx`                                      |
| Busqueda de producto por codigo                           | `src/services/products/productLookupCalculationService.test.js`                    |
| Traspasos: catalogo de la sucursal origen                 | `.../PageTransfers/hooks/useTransferOriginCatalog.test.js`                         |
| Traspasos: selector de origen                             | `.../PageTransfers/components/SendWorkspace.test.jsx`                              |
| Kits: cobertura solo en operativas                        | `.../ProductsPromotions/services/kitBranchCoverageService.test.js`                 |
| Ventas: stock en otras sucursales                         | `.../SalesComponents/services/searchModalService.test.js`                          |
| Sucursales: validacion del formulario                     | `.../SettingsBranches/utils/branchFormValidation.test.js`                          |
| Sucursales: campos por tipo                               | `.../SettingsBranches/utils/branchTypeFormConfig.test.js`                          |
| Sucursales: modal con tipo                                | `.../SettingsBranches/components/BranchFormModal.test.jsx`                         |
| Sucursales: edicion sin filas afectadas (RLS)             | `.../SettingsBranches/services/branchesMutationService.test.js`                    |
| Terminal: perfil de sucursal sin filas afectadas (RLS)    | `.../SettingsTerminal/services/branchProfileService.test.js`                       |
| Contrato SQL: RPCs de sucursales sin anon                 | `supabase/migrations/branchesRpcsRevokeAnonContract.test.js`                       |
| Contrato SQL: inventario sin sucursal admin               | `supabase/migrations/rejectAdminBranchInventoryContract.test.js`                   |
| Contrato SQL: guard de admin en set_branch_active         | `supabase/migrations/setBranchActiveAdminGuardContract.test.js`                    |
| Productos: alta en terminal admin (render)                | `.../ProductsNew/ProductsNew.test.jsx`                                             |
| Productos: inventario en edicion (render)                 | `.../ProductsModify/components/ProductModifyInventorySection.test.jsx`             |
| Caja: sesión y apertura (RPC)                             | `src/services/cashRegisterService.test.js`                                         |
| Caja: configuración operativa (remoto y offline)          | `src/services/cashOperationSettingsService.test.js`                                |
| Caja: configuración operativa (hook y vista)              | `.../PageSettings/SettingsCash/SettingsCash.test.jsx`                              |
| Ticket: golden de salida                                  | `src/utils/ticket/ticketBuilder.test.js`                                           |
| Ticket: primitivas de layout                              | `src/utils/ticket/ticketLayoutFormatters.test.js`                                  |
| Ticket: formateadores de fecha                            | `src/utils/ticket/ticketDateFormatters.test.js`                                    |
| Ticket: extracción de items                               | `src/utils/ticket/ticketItemFormatters.test.js`                                    |
| Ticket: servicios de recompensas                          | `src/utils/ticket/ticketRewardService.test.js`                                     |
| Ticket: servicios de pagos                                | `src/utils/ticket/ticketPaymentService.test.js`                                    |
| Ticket: formateadores de sucursal                         | `src/utils/ticket/ticketBranchFormatters.test.js`                                  |
| Ticket: servicios de puntos                               | `src/utils/ticket/ticketPointsService.test.js`                                     |
| Ticket: secciones                                         | `src/utils/ticket/ticketSections.test.js`                                          |
| Reportes: ciclo de vida del dashboard                     | `.../PageReportsHome/hooks/useReportsDashboard.test.js`                            |
| Supabase: paginacion sobre el tope de 1000 filas          | `src/services/supabase/paginatedQuery.test.js`                                     |
| Reportes: inicio lee todas las paginas                    | `.../PageReportsHome/services/reportsPagination.test.js`                           |
| Reportes: exportacion de ventas sin tope                  | `.../PageSalesReport/services/salesReportService.test.js`                          |
| Reportes: margen de rentabilidad con lectura paginada     | `.../PageProfitabilityReport/services/profitabilityReportPagination.test.js`       |
| Reportes: comisiones por paginas de la RPC                | `.../PageCommissionsReport/services/commissionsReportPagination.test.js`           |
| Reportes: caja (sesiones, movimientos, pagos, detalle)    | `.../PageCashReport/services/cashReportPagination.test.js`                         |
| Reportes: inventario por paginas de la RPC                | `.../PageInventoryReport/services/inventoryReportPagination.test.js`               |
| Reportes: productos vendidos e inventario muerto          | `.../PageProductsReport/services/productReportsPagination.test.js`                 |
| Reportes: clientes y detalle 360 sin tope                 | `.../PageCustomersReport/services/customersReportPagination.test.js`               |
| Estado de stock comun (agotado, stock bajo, disponible)   | `src/utils/stockStatus.test.js`                                                    |
| Kardex: lectura de movimientos                            | `.../PageKardex/services/kardexService.test.js`                                    |
| Catalogo de la sucursal completo (varias paginas)         | `src/services/products/productCatalogService.test.js`                              |
| Corte de caja: turno de varias paginas y lotes            | `src/pages/CashCut/services/cashCutReportPagination.test.js`                       |
| Ventas: efectivo disponible de la sesion                  | `src/components/SalesComponents/services/salesCashService.test.js`                 |
| Claves SAT: validacion por lotes                          | `src/services/satClavesService.test.js`                                            |
| Kardex: estado de stock y orden de movimientos            | `.../PageKardex/utils/kardexMovementUtils.test.js`                                 |
| Kardex: Realtime y sondeo de respaldo                     | `.../PageKardex/hooks/useKardexRealtime.test.js`                                   |
| Kardex: formateadores                                     | `.../PageKardex/utils/kardexFormatters.test.js`                                    |
| Kardex: tabla (columnas de valuacion)                     | `.../PageKardex/components/KardexTable.test.jsx`                                   |
| Kardex: panel con paginacion                              | `.../PageKardex/components/KardexProductPanel.test.jsx`                            |
| Kardex: exportador Excel                                  | `.../PageKardex/services/kardexWorkbookBuilder.test.js`                            |
| Kardex: exportacion sobre el dataset completo             | `.../PageKardex/Pagekardex.test.jsx`                                               |
| Kardex: carga y error de productos (hook)                 | `.../PageKardex/hooks/useKardex.test.js`                                           |
| Ventas: sincronización de columnas                        | `.../SalesComponents/hooks/useSalesTableColumns.test.js`                           |
| Ventas: atajos de teclado                                 | `.../SalesComponents/hooks/useSalesKeyboardShortcuts.test.js`                      |
| Facturación: validación fiscal                            | `.../InvoicesComponents/services/fiscalValidationService.test.js`                  |
| Facturación: catálogos (usos CFDI, regímenes, C.P.)       | `.../InvoicesComponents/services/invoicesCatalogService.test.js`                   |
| Facturación: suscripciones realtime                       | `.../InvoicesComponents/services/invoicesRealtimeService.test.js`                  |
| Facturación: formateadores compartidos                    | `.../InvoicesComponents/utils/invoiceFormatters.test.js`                           |
| Facturación: cliente fiscal (cálculos)                    | `.../Modals/FiscalCustomerModal/services/fiscalCustomerCalculationService.test.js` |
| Facturación: cliente fiscal (datos)                       | `.../Modals/FiscalCustomerModal/services/fiscalCustomerService.test.js`            |
| Facturación: factura de venta (cálculos)                  | `.../Modals/InvoiceSaleModal/services/invoiceSaleCalculationService.test.js`       |
| Facturación: factura de venta (datos)                     | `.../Modals/InvoiceSaleModal/services/invoiceSaleService.test.js`                  |
| Facturación: clientes fiscales (cálculos)                 | `.../InvoiceCustomers/services/invoiceCustomersCalculationService.test.js`         |
| Facturación: clientes fiscales (datos)                    | `.../InvoiceCustomers/services/invoiceCustomersService.test.js`                    |
| Facturación: ajustes del emisor (cálculos)                | `.../InvoiceSettings/services/invoiceSettingsCalculationService.test.js`           |
| Facturación: ajustes del emisor (datos)                   | `.../InvoiceSettings/services/invoiceSettingsService.test.js`                      |
| Facturación: historial (cálculos)                         | `.../InvoicesHistory/services/invoicesHistoryCalculationService.test.js`           |
| Facturación: historial (datos del reporte)                | `.../InvoicesHistory/services/invoicesHistoryReportService.test.js`                |
| Facturación: historial (detalle 360)                      | `.../InvoicesHistory/services/invoicesHistoryDetailService.test.js`                |
| Facturación: ventas por facturar (cálculos)               | `.../InvoicesPending/services/invoicesPendingCalculationService.test.js`           |
| Facturación: ventas por facturar (datos)                  | `.../InvoicesPending/services/invoicesPendingService.test.js`                      |
| Smoke de render del renderer y guardas de ruta            | `src/App.test.jsx`                                                                 |
| Pedidos: servicio de datos y conteo de pendientes         | `.../PageOrders/services/ordersService.test.js`                                    |
| Pedidos: contexto de pendientes (polling y realtime)      | `src/contexts/PendingOrdersContext.test.jsx`                                       |
| Pedidos: mascara de cantidades enteras                    | `.../PageOrders/utils/ordersQuantityInput.test.js`                                 |
| Pedidos y traspasos: presets de rango de fechas           | `src/utils/dateRangePresets.test.js`                                               |
| Traspasos: tabla de historial (filtros y paginacion)      | `.../PageTransfers/components/HistoryTable.test.jsx`                               |
| Traspasos: filtros de fecha (limites del DatePicker)      | `.../PageTransfers/components/HistoryFilters.test.jsx`                             |
| Traspasos: pestanas de ruta                               | `.../PageTransfers/components/RouteTabs.test.jsx`                                  |
| Traspasos: filtros de historial (hook)                    | `.../PageTransfers/hooks/useTransferHistoryFilters.test.js`                        |
| Traspasos: filtrado por fecha de creacion                 | `.../PageTransfers/utils/transfersDateRange.test.js`                               |
| Traspasos: hero (sucursal y KPIs operativos)              | `.../PageTransfers/components/HeroSection.test.jsx`                                |
| Traspasos: espacio de recepcion (lista y detalle)         | `.../PageTransfers/components/ReceiveWorkspace.test.jsx`                           |
| Traspasos: modal de detalle (titulo, origen y destino)    | `.../PageTransfers/components/modals/TransferDetailModal.test.jsx`                 |
| Traspasos: busqueda de productos con existencia           | `.../PageTransfers/hooks/useProductLookup.test.js`                                 |
| Traspasos: recepcion (seleccion y cantidades)             | `.../PageTransfers/hooks/useReceiveForm.test.js`                                   |
| Traspasos: formulario de envio (borrador y stock)         | `.../PageTransfers/hooks/useSendForm.test.js`                                      |
| Traspasos: carga de sucursales y ordenes                  | `.../PageTransfers/hooks/useTransferDataLoad.test.js`                              |
| Traspasos: estado de la pagina                            | `.../PageTransfers/hooks/useTransferPage.test.js`                                  |
| Traspasos: carga y error en el buscador de la pagina      | `.../PageTransfers/PageTransfers.test.jsx`                                         |
| Traspasos: servicio de datos (sucursales y ordenes)       | `.../PageTransfers/services/transferService.test.js`                               |
| Traspasos: calculos de sucursal y orden                   | `.../PageTransfers/utils/TransfersCalculationService.test.js`                      |
| Traspasos: utilidades (meta, fechas y presets)            | `.../PageTransfers/utils/transfersUtils.test.js`                                   |
| Pedidos: formateadores y opciones de estado               | `.../PageOrders/utils/ordersFormatters.test.js`                                    |
| Pedidos: clases de estatus                                | `.../PageOrders/utils/ordersStatusClasses.test.js`                                 |
| Pedidos: reglas de producto global                        | `src/services/inventory/inventoryProductCalculationService.test.js`                |
| Pedidos: busqueda de productos (locales y globales)       | `.../Modals/InventorySearchModal/InventorySearchModal.test.jsx`                    |
| Pedidos: borrador persistente por usuario y sucursal      | `src/contexts/OrderDraftContext.test.jsx`                                          |
| Pedidos: detalle de producto por sucursal (hook)          | `.../PageOrders/hooks/useProductInsightsDetail.test.js`                            |
| Pedidos: formulario de creacion (solo productos globales) | `.../PageOrders/hooks/useCreateOrderForm.test.jsx`                                 |
| Pedidos: catalogo de productos locales                    | `.../PageOrders/services/localProductsCatalogService.test.js`                      |
| Pedidos: confirmacion para volver global un producto      | `.../Modals/InventorySearchModal/components/MakeGlobalConfirmModal.test.jsx`       |
| Ajustes: carga, F10, grant vencido y reintento (hook)     | `.../PageAdjustments/hooks/useInventoryAdjustment.test.js`                         |
| Ajustes: buscador y accion del modal de reautorizacion    | `.../PageAdjustments/PageAdjustments.test.jsx`                                     |
| Ajustes: busqueda y seleccion del producto (hook)         | `.../PageAdjustments/hooks/useAdjustmentProductSelection.test.js`                  |
| Ajustes: normalizacion y parseo de la diferencia          | `.../PageAdjustments/services/adjustmentQuantityCalculationService.test.js`        |
| Inventario: reautorizacion por grant vencido compartida   | `src/hooks/useGrantReauthorization.test.js`                                        |
| Productos: buscador (dialogo, sin kits, clic y flechas)   | `.../Modals/ProductsSearchModal/ProductsSearchModal.test.jsx`                      |
| Buscadores: dialogo compartido (botones, conteo y cierre) | `src/components/ModalControls/ProductSearchDialog.test.jsx`                        |
| Ventas: buscador de productos como dialogo                | `.../SalesComponents/Modals/SearchModal/SearchModal.test.jsx`                      |
| Pedidos: hook para volver global un producto local        | `.../Modals/InventorySearchModal/hooks/usePromoteLocalProduct.test.js`             |
| Pedidos: servicio para volver global un producto          | `src/services/inventory/promoteProductToGlobalService.test.js`                     |
| Pedidos: contrato SQL de producto con is_global nulo      | `supabase/migrations/promoteProductNullIsGlobalContract.test.js`                   |
| Pedidos: historial (filtros de pedido y producto)         | `.../PageOrders/components/OrdersHistoryTable.test.jsx`                            |
| Pedidos: regla de destino bloqueado                       | `.../PageOrders/utils/ordersHistoryDestinationLock.test.js`                        |
| Pedidos: hook de destino bloqueado                        | `.../PageOrders/hooks/useHistoryDestinationLock.test.js`                           |
| Pedidos: aviso, diferencias y estado por partida          | `.../PageOrders/utils/ordersCalculationService.test.js`                            |
| Pedidos: detalle (paginacion y tabla de diferencias)      | `.../PageOrders/components/OrderPreviewSections.test.jsx`                          |
| Pedidos: panel de recepcion (paginacion y faltantes)      | `.../PageOrders/components/ReceiptPanel.test.jsx`                                  |
| Pedidos: servicio realtime                                | `src/services/inventory/ordersRealtimeService.test.js`                             |
| Pedidos: contrato SQL de realtime                         | `supabase/migrations/storeOrdersRealtimeContract.test.js`                          |
| Pedidos: badge de sucursal (nombre, mayusculas, rol)      | `.../PageOrders/components/BranchBadge.test.jsx`                                   |
| Pedidos: badge del nombre del pedido                      | `.../PageOrders/components/OrderNameBadge.test.jsx`                                |
| Pedidos: modal de detalle (cabecera, titulo y ruta)       | `.../PageOrders/components/OrderDetailModal.test.jsx`                              |
| Pedidos: aviso con cierre automatico                      | `.../PageOrders/components/FeedbackBanner.test.jsx`                                |
| Pedidos: estilos (clases, negritas, encabezado recepcion) | `.../PageOrders/PageOrders.styles.test.js`                                         |
| Pedidos: contrato SQL de nombres en mayusculas            | `supabase/migrations/storeOrdersUppercaseContract.test.js`                         |
| Modal base (footer, capa en la pila e icono en large)     | `src/components/AppModal/AppModal.test.jsx`                                        |
| Pila de modales (capas y bloqueo de atajos)               | `src/contexts/ModalStackContext.test.jsx`                                          |
| Modal base: boton de cancelar de pie (etiqueta)           | `src/components/ModalControls/ModalFooterCancelButton.test.jsx`                    |
| Notas de venta: sin X, con Cancelar y Guardar             | `.../SalesComponents/Modals/NotesModal/NotesModal.test.jsx`                        |
| Eliminar articulo: etiqueta y Enter                       | `.../SalesComponents/Modals/DeleteItemModal/DeleteItemModal.test.jsx`              |
| Eliminar ticket pendiente: sin X ni Delete                | `.../SalesComponents/Modals/DeleteTicketModal/DeleteTicketModal.test.jsx`          |
| Modales de captura de Ventas: sin X de cabecera           | `.../SalesComponents/Modals/modalCloseButtons.test.jsx`                            |
| Ventas: capas modales registradas por cada setter         | `.../SalesComponents/hooks/useSalesModals.test.jsx`                                |
| Historial: botones de accion (3 arriba y 2 abajo)         | `.../SalesComponents/Modals/SalesHistoryModal/SalesHistoryModal.styles.test.js`    |
| Historial: modal Notas del ticket                         | `.../SalesComponents/Modals/SalesHistoryModal/TicketNotesModal.test.jsx`           |
| Historial: Escape con Notas abiertas                      | `.../SalesComponents/Modals/SalesHistoryModal/SalesHistoryModal.escape.test.jsx`   |
| Devolucion parcial: Escape                                | `.../SalesComponents/Modals/PartialReturnModal/PartialReturnModal.escape.test.jsx` |
| Lista paginada compartida de modales                      | `src/components/ModalPaginatedList/ModalPaginatedList.test.jsx`                    |
| Aplicar descuento: paginacion de resultados               | `.../Modals/ProductDiscountRewardModal/ProductDiscountRewardModal.test.jsx`        |
| Aplicar recompensas: paginacion de productos              | `.../Modals/RewardProductSelectionModal/RewardProductSelectionModal.test.jsx`      |
| Descuento y recompensas: boton de confirmar a la derec    | `.../SalesComponents/Modals/rewardModalsFooter.styles.test.js`                     |
| Asignar cliente: puntos vigentes del cliente asignado     | `.../SalesComponents/Modals/ClientModal/ClientModal.test.jsx`                      |
| Cliente publico en general: deteccion de nombre           | `.../SalesComponents/services/publicCustomerService.test.js`                       |
| Venta en curso: carrito, cliente y expiracion             | `src/contexts/SalesCartContext.test.jsx`                                           |
| Navbar: atajos bloqueados con modales abiertos            | `src/components/Navbar/hooks/useKeyboardShortcuts.test.jsx`                        |
| Ventas: borrador (restauracion y guardado)                | `.../SalesComponents/hooks/useSalesDraft.test.js`                                  |
| Ventas: borrador con cliente expirado                     | `.../SalesComponents/hooks/useSalesStateActions.test.js`                           |
| Ventas: expiracion del cliente asignado                   | `.../SalesComponents/services/salesClientExpiryService.test.js`                    |
| Ventas: descriptor de capas modales                       | `.../SalesComponents/services/salesModalLayersService.test.js`                     |
| Pedidos: contrato SQL de permisos (revoke anon)           | `supabase/migrations/storeOrdersRevokeAnonContract.test.js`                        |
| Pedidos: contrato SQL de integridad                       | `supabase/migrations/storeOrdersIntegrityContract.test.js`                         |
| Pedidos: contrato SQL de nota de recepcion                | `supabase/migrations/storeOrdersReceiptNotesContract.test.js`                      |
| Pedidos: contrato SQL de costo de recepcion y CPP         | `supabase/migrations/storeOrdersReceiptCostContract.test.js`                       |
| Pedidos: contrato SQL de costos finitos y tope            | `supabase/migrations/storeOrdersReceiptCostFiniteContract.test.js`                 |
| Pedidos: contrato SQL de hora local en la recepción       | `supabase/migrations/storeOrdersReceiptLocalTimeContract.test.js`                  |

### Cobertura transitiva del resolver de costo

`src/services/inventory/inventoryCostResolutionService.js` no tiene un archivo de test propio. Se
prueba a través de `.../PageAdd/services/inventoryAddProjectionService.test.js` (18 casos), el camino
de la interfaz.

Desde `20261117230000` el alta ya no usa el resolver para persistir: `add_inventory_entry` resuelve
el CPP vigente en SQL (`branch_inventory.cost_price` con fallback al catálogo).
`addInventoryEntryContract.test.js` fija esa regla, el bloqueo de la fila y la fórmula contra el SQL
real. La paridad entre la proyección (JS) y la RPC (SQL) no tiene un test que ejecute ambas: una
regla nueva de costo debe cambiarse en los dos lados.

## Patrones y convenciones

- **Contrato de servicios:** los servicios de datos devuelven `{ success, data, error, partial }`.
  Los tests verifican ese contrato, incluyendo el caso `partial: true` (operación principal OK pero
  paso secundario fallido, ej. producto creado pero inventario no).
- **Mock de Supabase:** se mockea `supabase` con `vi.mock` y se usan dos helpers locales:
  - `thenableQuery({ data, error })` — simula una query encadenable (`.select().eq()...`) que además
    es `thenable`.
  - `rpcBuilder({ data, error })` — simula `supabase.rpc(...)`.
    Estos helpers están duplicados por archivo (candidatos a extraerse a un helper compartido).
  - Para probar paginacion, usar `createFakePostgrest` y `withSmallPages` de
    `src/services/supabase/fakePostgrest.testUtils.js` en lugar de crear 1000 filas.
- **Hooks:** se prueban con `renderHook`/`act` de `@testing-library/react`.
  Para cambiar las props en un caso de prueba, `renderHook` necesita `initialProps` y el callback
  debe recibir ese objeto como parámetro: `renderHook((props) => useX(props), { initialProps })`.
  Si el callback cierra sobre variables externas, `rerender(...)` no cambia nada y el test pasa sin
  estar probando lo que cree.
- **Matchers de DOM:** el proyecto **no** instala `@testing-library/jest-dom`. No existen
  `toBeInTheDocument`, `toHaveTextContent` ni `toHaveClass`: usarlos lanza
  `Invalid Chai property`. Para contenido usa `expect(el.textContent).toContain(...)` y para clases
  `expect(el.className).toContain(...)`.
- **Reloj congelado en pruebas de fechas:** todo test cuyo resultado dependa de "hoy" (por ejemplo,
  calendarios `react-datepicker` con `minDate`, que descartan fechas anteriores) debe congelar el
  reloj con `vi.useFakeTimers({ toFake: ["Date"] })` y `vi.setSystemTime(...)` en `beforeEach`, y
  restaurarlo con `vi.useRealTimers()` en `afterEach`. Sin esto la prueba se rompe sola cuando la
  fecha real rebasa la capturada. Ejemplos: `KitFormSection.test.jsx` y
  `KitRenewValidityForm.test.jsx`.
- **Estilo:** seguir el patrón existente; no introducir un framework de mocking distinto.

## Huecos de cobertura

Cubierto en la Fase 4 (rama `test/coverage-gaps`):

- **RPC de ventas:** contrato mock de `create_sale_transaction`
  (`salesTransactionService.test.js`) y contrato SQL de `create_sale_transaction` /
  `create_transfer_order` contra la migración `20260917200000`
  (`transactionalRpcsContract.test.js`), incluido el cross-check cliente↔BD de nombres de
  parámetros. `create_transfer_order` aún no tiene caller JS (la vista de traspasos es el stub de
  #12), por eso se fija su interfaz SQL.
- **Lógica de impresión y corte** (29 sep 2026, rama `feature/ticket-printer-ipc-setup`):
  `cashCutBuilder.js` (secciones, totales, wrapping e invariante de 32 columnas) y
  `ticketPrinter.js` sobre su contrato completo de `{ success, message, error, simulated }`: invocación
  del canal `print-ticket`, normalización de rechazos y excepciones, y el fallback `simulated` de
  navegador. Del lado del proceso principal, `ticketPrintService.test.js` (46 casos) fija los perfiles
  de papel, el documento HTML, la traducción de `options` a opciones de `webContents.print`, la espera
  de carga, el descarte de `did-fail-load` con código `-3`, la destrucción de la ventana utilitaria,
  el soporte dual de callback nativo y Promesa, y
  el descubrimiento de impresoras; `mainProcess.test.js` fija el canal `print-ticket` de extremo a
  extremo, incluida la respuesta `NO_PRINTER_AVAILABLE` sin abrir ventana. Ver `KNOWN_ISSUES.md` #59.
  `electron/main.js` sigue siendo wiring puro y `electron/preload.js` no tiene test: la lista blanca
  de canales solo se valida contra los `ipcMain.handle` registrados.
- **Ganchos de página de reportes y de ventas** (25 sep 2026, 21 casos, rama
  `fix/code-quality-and-runtime-bugs`): `useReportsDashboard.test.js` fija que el `finally` de la
  petición obsoleta no invierte el resultado (mutación: quitar el guard rompe el caso), que una
  respuesta tardía no pisa el estado y que el intervalo se limpia al desmontar;
  `useSalesTableColumns.test.js` fija que cada listener de `mousedown` se empareja con su `mouseup`
  y que una columna reordenada invalida los cierres previos; `useSalesKeyboardShortcuts.test.js`
  fija que los atajos leen siempre las props vigentes sin re-registrar el listener.
- **Servicios de Facturación** (28 sep 2026, 294 casos en 17 archivos, rama
  `refactor/invoices-modularization-and-dip`): las 14 suites nuevas cubren los 16 servicios de
  cálculo y datos de las cuatro pantallas y los dos modales (payload de factura interna, conceptos y
  pagos derivados de la venta, ensamble del payload fiscal del cliente, normalización de RFC y
  C.P., rangos del día con desfase `-05:00`, filtrado de ventas sin factura, y los contratos de
  consulta de `customers`, `sales`, `invoices`, `invoice_items`, `invoice_payments` y códigos
  postales). `invoicesRealtimeService.test.js` fija el contrato que la auditoría de #54 rompió: un
  binding `postgres_changes` por tabla con `table` resuelto, un solo `.subscribe()` y el payload
  entregado a `onChange`.
- **Costo promedio ponderado (2 oct 2026, 23 casos en 1 archivo, rama
  `feature/costo-promedio-ponderado`):** `costSnapshotContract.test.js` fija el contrato SQL de
  `20261002124615_add_cost_tracking_and_sale_cost_snapshot.sql`: las columnas
  `inventory_movements.unit_cost`/`total_cost` y `sale_details.cost_price` con sus tipos y default,
  la resolución del costo desde `branch_inventory.cost_price` con fallback a `products.cost_price`, el
  `INSERT` del snapshot en las tres sobrecargas de `create_sale_transaction` (comprueba que
  `cost_price` sea la última columna y que la lista de valores esté alineada con la de columnas), que
  la sobrecarga efectiva de 11 parámetros conserve las columnas de comisión, que la migración no haga
  backfill histórico y que cada sobrecarga mantenga `SECURITY DEFINER`, `SET search_path TO 'public'`
  y los grants mínimos. Además `transactionalRpcsContract.test.js` se extendió para fijar que la
  definición vigente (la última migración que la redeclara) no altera la firma de la RPC endurecida
  de `20260917200000`, de modo que una redefinición futura no pueda cambiar los parámetros que el
  cliente envía ni perder el hardening.
- **Costo promedio ponderado, calculo y servicios** (2 oct 2026, 53 casos en 3 archivos, rama
  `feature/cpp-fase-2-servicios-y-calculo`): cierra el hueco de calculo que dejo la fase anterior.
  `inventoryCostCalculationService.test.js` (25 casos) fija la formula
  `((stock * costo) + (cantidad * costoEntrante)) / (stock + cantidad)` con el caso real de negocio
  (10 @ 100 -> +10 @ 400 = 250.00 -> +10 @ 200 = 233.33), los bordes de cantidad (stock 0, entrada 0,
  entrada negativa, fraccionadas, redondeo a 2 decimales) y la proteccion R2: stock negativo tratado
  como 0, costo entrante negativo neutralizado a 0 y resultado nunca negativo. Tambien fija la
  coercion de `NaN`, `Infinity`, `null`, `undefined`, strings numericos y la invocacion sin
  argumentos. `inventoryAddService.test.js` fija que el alta llame una sola vez a `add_inventory_entry`
  sin escribir tablas desde el cliente, que mande `null` como costo en entrada manual o costo no
  numérico (y `0` cuando el costo es cero) y que propague el error de la RPC. El cálculo del CPP en
  la persistencia lo fija `addInventoryEntryContract.test.js` contra el SQL. `inventoryMovements.test.js` (8 casos)
  fija el mapeo de `unit_cost`/`total_cost` con `Math.max(0, ...)` (R2), que los movimientos que no
  informan costo (ajustes, ventas, devoluciones) sigan guardando NULL, que un `null` explicito se
  guarde como NULL y no como 0, y que el fallback por columna ausente omita ambas columnas en lugar
  de fallar.
  El calculo puro vive en `src/services/inventory/` y no importa Supabase (SRP/DIP); el servicio de
  alta es el unico que persiste.

  **Distincion `null` vs `0` en las columnas de costo.** `NULL` significa "el movimiento no mueve
  valor" y `0` significa "se movio valor a costo cero": no es lo mismo y el reporte de rentabilidad
  depende de la distincion para separar costo real de costo desconocido. El guard nullish de
  `toCostColumn` va **antes** de la coercion a proposito, porque `Number(null)` es `0` y sin el guard
  un `unitCost: null` explicito persistiria un `0` falso. Ver el hallazgo H1 en la bitacora de
  auditoria.

  **Altas que no son compras no re-ponderan el CPP.** `resolveIncomingCostPrice` valora la mercancia
  entrante al costo promedio vigente cuando el flujo no informa un costo de compra explicito, de modo
  que `((stock*c) + (qtd*c)) / (stock+qtd) === c` y el promedio queda intacto. Heredar el precio de
  catalogo en ese caso contaminaria la base de costo de la sucursal con una operacion que no
  adquiere valor (correccion de conteo fisico, resguardo), y de forma silenciosa. El catalogo sigue
  sirviendo como promedio de referencia cuando **no existe** costo previo (primera fila de
  `branch_inventory` o `cost_price` nulo), que es el unico caso en que no hay lote al cual entrar al
  mismo costo. Solo un `incomingCostPrice` explicito y finito dispara la re-ponderacion real; un valor
  presente pero no numerico cae al costo vigente en vez de re-ponderar con basura. Ver el hallazgo H2.

  **Costo de adquisicion canonico.** `resolveIncomingCostPrice` redondea a 2 decimales una sola vez, y
  ese valor es el que alimenta el CPP, el `unit_cost` del movimiento y la base del `total_cost`. Asi se
  sostiene la invariante contable `total_cost === round(unit_cost * cantidad)`; redondear solo el
  importe dejaria `unit_cost` con mas decimales que el total que lo deriva (33.333 x 3 = 99.999 contra
  un `total_cost` de 99.99) y el movimiento dejaria de cuadrar consigo mismo.

  **Verificacion por mutacion.** Las tres suites se contrastaron mutando el codigo de produccion:
  quitar el clamp de negativos de `toNonNegativeNumber` rompe 3 casos; quitar el mapeo de columnas de
  costo rompe 5; quitar el guard nullish de `toCostColumn` rompe 2; revertir el fallback del CPP al
  catalogo rompe 5. La rama `if (safeCurrentStock <= 0)` **no** es detectable por mutacion y no se
  cuenta como verificada: con stock 0 la formula ya devuelve `(0*c + qtd*p)/(0+qtd) === p`, que es
  identico al `return roundCost(safeIncomingCost)`, y ninguna combinacion de cantidades fraccionadas
  y costos en centavos produce una diferencia tras el redondeo. Se conserva de todos modos porque
  documenta la regla de negocio ("sin base ponderable, el costo es el del lote entrante") y protege
  contra una reformulacion futura de la formula; lo que no debe afirmarse es que un test lo exija.

- **Smoke de render del renderer** (1 oct 2026, 15 casos en 1 archivo, rama
  `test/renderer-smoke-tests`): `App.test.jsx` monta la jerarquía real de `src/main.jsx`
  (`<BranchProvider><App /></BranchProvider>`) con `supabaseClient` y `productCatalogService`
  simulados y las páginas lazy sustituidas por stubs, de modo que el test mide el montaje y el
  enrutado y no la red de cada vista. Fija el arranque en frío (`LoadingScreen` → `/login`), todas
  las ramas de `AuthGuard` (sin caja, con caja, `requireNoCashRegister`, `isLocked`), la ruta raíz, el
  wildcard y la resiliencia de `useResponsiveScale` con y sin `window.electronAPI`. Para poder usar
  `MemoryRouter` sin anidar dos routers de React Router 7, `AppRoutes` es named export y acepta
  `RouterComponent` (por omisión `HashRouter`), igual que `App`.
- **Paginacion del catalogo, el corte y la importacion** (21 nov 2026, rama
  `fix/paginacion-catalogo-y-caja`): `src/services/supabase/fakePostgrest.testUtils.js` es un doble
  compartido de `supabase.from()` que responde como PostgREST: aplica `eq`/`in`/`gte`/`lte`/`gt`,
  ordena por los `.order()` recibidos y **corta cada respuesta en `maxRows` (2) aunque se pida un
  `.limit()` mayor**. `withSmallPages` se usa en un `vi.mock` de `paginatedQuery` para forzar
  paginas y lotes de 2, asi pocas filas simulan varias paginas; cada test nuevo falla si el
  servicio vuelve a la consulta sin paginar. `productCatalogService.test.js` fija que el catalogo de
  la sucursal y los globales activos llegan completos y en orden de alta (`created_at` ascendente).
  `cashCutReportPagination.test.js` fija que un turno de varias paginas y varios lotes de `.in()` da
  los mismos totales de ventas, pagos por metodo, dolares, departamentos y canjes que el turno
  completo, y que cancelaciones y devoluciones salen de la mas reciente a la mas antigua.
  `salesCashService.test.js` fija el efectivo disponible con ventas, cancelaciones y devoluciones de
  varias paginas. `localProductsCatalogService.test.js` y `productKitsService.test.js` fijan los
  productos locales de pedidos y el selector de kits (orden por nombre). `satClavesService.test.js`
  y `productsImportService.test.js` fijan la validacion de importacion por lotes, sin repetidos y con
  `cursorColumn: "clave"` en la tabla SAT, que no tiene `id`; `paginatedQuery.test.js` suma los
  casos de `cursorColumn`.
- **Paginacion sobre el tope de PostgREST y estado de stock comun** (20 nov 2026, rama
  `fix/kardex-paginacion-y-estado-stock`): PostgREST corta cada respuesta en 1000 filas sin error.
  `src/services/supabase/paginatedQuery.js` concentra `fetchAllPages` (cursor keyset sobre `id`),
  `fetchByIdsInBatches` (lotes del `.in()`) y `fetchAllRpcPages` (`.range()` para RPC con un
  `.order()` estable del llamador). Las tres aceptan `pageSize`/`batchSize` para que los tests
  paginen con 2 filas en vez de crear 1000; `paginatedQuery.test.js` fija el cursor, la pagina
  incompleta como fin, la fila sin `id` como error y que el primer error corta sin filas parciales.
  `kardexService.test.js` fija que el kardex lee varias paginas, ordena en memoria por `created_at`
  descendente con desempate por `id`, que el reintento sin costos tambien pagina y que el error de la
  segunda pagina se propaga. `src/utils/stockStatus.test.js` y `kardexMovementUtils.test.js` fijan los
  bordes de la regla comun (stock igual al minimo, 0, negativo, minimo 0, sin inventario) y el
  sobrestock exclusivo de Kardex. `useKardexRealtime.test.js` fija que el sondeo de 30 s solo corre
  tras `CHANNEL_ERROR`/`TIMED_OUT`, se detiene con `SUBSCRIBED` tras recargar una vez los slots
  seleccionados, y que el fallo del refresco en segundo plano se registra con `console.error`.
- **Reportes sobre el tope de PostgREST, parte 1** (21 nov 2026, 15 casos en 4 archivos, rama
  `fix/paginacion-reportes`): inicio, ventas, rentabilidad y comisiones leen todas las filas con
  `paginatedQuery`. `src/services/supabase/fakeSupabase.testUtils.js` es un doble de `supabase`
  que responde como PostgREST (filtros `eq`/`in`/`not`/`ilike`/`gt`..., `.order()`, `.range()` y
  RPC) y corta cada respuesta en `maxRows` aunque se pida un `.limit()` mayor; `withSmallPages`
  fuerza paginas y lotes de 2 en `paginatedQuery` via `vi.mock`. Con 5 ventas y 3 partidas por
  venta cada test lee varias paginas por consulta y por lote, y falla con el codigo anterior.
  `profitabilityReportPagination.test.js` fija la traza de margen: con la lectura truncada el
  reporte daba ingreso $150, costo $90 y 40%; leyendo todo da $540, $360 y 33.33%.
  `commissionsReportPagination.test.js` fija que partidas con el mismo `created_at` no se repiten
  ni se saltan entre paginas gracias al desempate por `detail_id`, y que una venta registrada entre
  dos paginas no duplica partidas (deduplicacion por `detail_id`). El costo de un kit con sus
  componentes en paginas posteriores de `products` y `branch_inventory` protege la lectura
  completa del catalogo, del inventario y de los kits (`product_kits`). Las cancelaciones del dia (`getTodayCancelledSales`) se
  cuentan sobre varias paginas, y el orden por fecha de inicio y de la exportacion de ventas
  compara instantes, no texto (`12:00:00+00:00` antes que `12:00:00.5+00:00`).
- **Reportes sobre el tope de PostgREST, parte 2** (21 nov 2026, 8 casos en 4 archivos, rama
  `fix/paginacion-reportes-b`): caja, inventario, productos y clientes leen todas las filas con
  `paginatedQuery` y el doble `fakeSupabase.testUtils.js` (que suma `.single()` para el detalle de
  sesion). `cashReportPagination.test.js` fija que sesiones con el mismo `opened_at` no se repiten
  gracias al desempate por `session_id`, y que movimientos y detalle conservan el orden por fecha
  aplicado en memoria. `inventoryReportPagination.test.js` fija el orden por `product_name` con
  desempate por `product_id`. Los tests de contrato existentes de caja e inventario ahora esperan
  `.order()` + `.range(0, 999)` en la RPC y `.limit(1000)` por pagina en lugar de los topes fijos.
- **Kardex: paginacion por producto y columnas de valuacion** (3 oct 2026, 67 casos en 6 archivos,
  rama `feature/kardex-pagination-and-valuation-columns`): cubre las seis piezas del flujo de kardex.
  `kardexService.test.js` (17 casos) fija el contrato de la consulta: que el `select` pida
  `unit_cost`/`total_cost` ademas de las columnas de movimiento y existencias, el filtro por producto,
  la propagacion del error de Supabase y el **reintento defensivo** que degrada la vista a un kardex
  sin costos cuando la base no tiene esas columnas. Ese reintento se dispara con el codigo de Postgres
  `42703` (undefined_column) o con el mensaje que reporta la columna inexistente, reintenta una sola
  vez omitiendo ambas columnas del `select`, mapea `unit_cost`/`total_cost` a `null` para que la tabla
  y el exportador muestren el guion largo en vez de tratar un dato ausente como costo real, y propaga
  el error del segundo intento en vez de devolver un kardex vacio. Los casos fijan que el camino feliz
  consulta una sola vez, que un error ajeno no dispara reintento y que la degradacion queda
  registrada con `console.error`.
  `kardexFormatters.test.js` (4 casos) fija los rotulos de rango de fechas y el formato de moneda con
  los bordes de valor ausente, cero y no numerico, que la tabla y el exportador deben compartir. `KardexTable.test.jsx` (10 casos) fija el render de las
  siete columnas, que las de valuacion diffusan guion largo cuando el movimiento no trae costo y
  que las de cantidad y existencia siguen alineadas al centro. `KardexProductPanel.test.jsx` (18
  casos) fija la paginacion por producto con `usePagination`: que solo se renderice la pagina
  visible mientras el encabezado, el `totalItems` de la barra y el exportable siguen reflejando el
  total, el avance y retroceso, el cambio de tamano de pagina, el reinicio al cambiar de producto o
  de rango de fechas, el acodo cuando el conjunto se reduce, la independencia entre los dos slots de
  la vista comparativa y que la exportacion emita el slot sin que la pagina altere el total.
  `kardexWorkbookBuilder.test.js` (16 casos) fija el reporte de Excel contra un libro real de
  ExcelJS (no un mock): el merge del titulo en siete columnas, los encabezados, el ancho y el
  `numFmt` de moneda de las columnas de valuacion, la alineacion izquierda de los importes numericos
  frente al centrado de los guiones, y que los movimientos sin costo, con costo cero o con costo
  negativo se exporten como texto y **sin** `numFmt`. Esa ultima asercion es lo que sustenta que el
  formato de moneda tenga una sola seccion: como el cero y el negativo nunca llegan a ser numero, las
  secciones de negativo y cero del formato serian codigo muerto.

  **La exportacion opera sobre el dataset completo, nunca sobre la pagina visible.** Este invariante
  lo fijan `Pagekardex.test.jsx` (2 casos) y el bloque de exportacion de `KardexProductPanel.test.jsx`,
  y es la razon de que el panel no exponga las filas paginadas hacia arriba: `pageItems` produce una
  rebanada derivada que no se guarda en estado ni se eleva, mientras `rowsBySlot` conserva el conjunto
  completo. La comprobacion es una mutacion: al recortar `handleExport` a las diez filas visibles la
  suite fallaba con `expected ... to have a length of 25 but got 10`, y antes de existir estos casos
  pasaba en verde. Un reporte de kardex se usa para auditar el conteo fisico contra el teorico, asi
  que un truncamiento silencioso es el peor modo de fallo posible; por eso la prueba vive en el
  call-site de `Pagekardex.jsx` y no solo en el panel, que nunca ve las filas del reporte.

- **Pedidos de abastecimiento: integridad de cantidades y polling del badge** (24 oct 2026, rama
  `feat/orders-history-pagination`): `PendingOrdersContext.test.jsx` (6 casos) fija que el badge
  consulta solo el conteo (`countPendingStoreOrders`) y que a los 30 s vuelve a pedir el conteo sin
  descargar el historial (`loadStoreOrders` no se invoca); el caso del intervalo falla si se quita el
  `setInterval` (verificado por mutación). `ordersService.test.js` (8 casos) fija que las cantidades
  fraccionarias se rechazan antes de llamar a la RPC, tanto al crear como al recibir, y que una
  relectura vacía del pedido se convierte en error explícito en vez de continuar con un snapshot nulo.
  `ordersQuantityInput.test.js` (6 casos) fija la máscara entera: `2.5 -> 2` porque el campo controlado
  muestra siempre el valor guardado, y una captura negativa se descarta completa (`-3 -> ""`) en vez de
  convertirse en `3`. `dateRangePresets.test.js` (8 casos) fija los presets de fecha sin mutar la
  referencia, y `ordersFormatters.test.js` la etiqueta de diferencia por estado.
  `storeOrdersIntegrityContract.test.js` (9 casos) fija contra el SQL real el índice de historial, los
  constraints `NOT VALID`, las guardas `_user_can_access_branch` solo cuando `auth.uid()` no es nulo,
  el lock asesor del folio y los grants sin `anon`/`PUBLIC`. Las vistas de creación y recepción
  (`CreateOrderWorkspace`/`ReceiveOrdersWorkspace`) siguen sin prueba de render o interacción; la
  busqueda de productos que alimenta al primero ya tiene prueba de render y de sus reglas puras.

- **Pedidos: detalle por sucursal, borrador y volver global un producto local** (31 oct 2026, rama
  `feat/pedidos-detalle-producto-sucursal`): `MakeGlobalConfirmModal.test.jsx` fija que la palabra de
  confirmación escrita se borra al cerrar y reabrir el modal. `OrderDraftContext.test.jsx` fija que el
  borrador anterior nunca se expone tras un cambio de sucursal; la guarda derivada del contexto es
  equivalente al reinicio durante el render, por lo que quitarla no rompe ninguna prueba. El borrador
  vive solo en memoria: sobrevive a la navegación pero no a recargar la aplicación.
  `useProductInsightsDetail.test.js` fija que se ignora la respuesta tardía de una consulta anterior.
  `useCreateOrderForm.test.jsx` fija que se rechazan productos locales (`false`), sin marcar (`null`)
  y sin inventario (`tracks_inventory: false`). `useInventoryAdjustment.test.js` fija que escanear un
  kit o un producto sin inventario, o cargarlo desde el buscador F10, muestra el aviso y no lo
  selecciona.
  `localProductsCatalogService.test.js` fija el `console.error` al alcanzar el límite de 5000 filas.
  `promoteProductNullIsGlobalContract.test.js` (2 casos) lee la migración `20261031130000` y fija
  `coalesce(v_product.is_global, false)` y los grants; falla si se cambia a `true` (verificado por
  mutación). Esa migración está pendiente de aplicar en remoto.

- **Sucursales administrativas** (15 nov 2026, rama `feat/admin-branch-type`): los contratos SQL
  fijan la columna `branch_type` con su `CHECK`, la firma de 10 argumentos de `create_branch` y los
  cuatro triggers que rechazan una sucursal admin en ventas, movimientos, traspasos y pedidos (no se
  ejecutan en Postgres). `branchScopeService.test.js` fija que el filtro por tipo vive en un solo
  servicio y que una fila sin `branch_type` cuenta como operativa. Los tests de servicios de
  traspasos, pedidos, inventario, kits, reportes, facturas y buscador de ventas fijan que piden
  `branch_type = operational` y que el fallback nunca ofrece la sucursal admin.
  `useCreateOrderForm.test.jsx`, `useSendForm.test.js` y `useTransferOriginCatalog.test.js` fijan que
  una terminal admin elige el origen sin preselección, que el borrador se descarta al cambiar de
  origen y que el catálogo anterior no se muestra mientras carga el nuevo. En Pedidos, elegir un
  origen igual al destino limpia el destino. `useInventoryReport.test.js` fija que una terminal admin
  no preselecciona sucursal ni consulta inventario hasta elegir una, y que una operativa preselecciona
  la suya.
  `permissionsService.test.js`, `AuthGuard.test.jsx` y `Navbar.test.jsx` fijan que una terminal
  admin no entra a Ventas, Corte ni Facturación, no ve sus botones y no abre caja.
  `productCrudService.test.js` y `useProductsImport.test.js` fijan que desde una terminal admin el
  alta nace global sin inventario, la edición no toca `branch_inventory` y la importación se
  bloquea. `BranchContext.test.jsx` fija que la sucursal en caché recibe su `branch_type` y que la
  respuesta tardía de la sucursal anterior no pisa el tipo de la nueva.

No hay todavía:

- Tests de flujos de integración de punta a punta. Las vistas presentacionales del corte
  (`src/pages/CashCut/components/`) son puramente de render y no están cubiertas. Lo mismo aplica a
  los 25 subcomponentes de Facturación (`.../InvoicesComponents/**/components/`): son de render y
  reciben el estado ya resuelto del hook. La capa de UI cubierta es el smoke del renderer (las
  páginas que monta siguen siendo stubs) mas la vista de kardex, que es la primera en cubrirse con
  render e interaccion sobre la pagina real: `KardexTable.test.jsx`, `KardexProductPanel.test.jsx` y
  `Pagekardex.test.jsx` con los hooks de datos simulados. El resto de las vistas sigue sin cubrir.
- Tests del backend Express/SQLite (`src/backend/server.js` y `bd.js`): `app.listen()` y la apertura
  de SQLite ocurren al importar el módulo, por lo que requieren un desacople previo. La
  inicialización de Express/SQLite **no** vive en `electron/main.js`.
- Tests a nivel de ejecución de los RPC: se fija la firma SQL (parámetros, retorno, grants), no se
  ejecuta la función en Postgres.
- Tests E2E.
- Los mapeos de pagos por método, departamentos y dólares en `useCashCutReport`: los fetches
  secundarios se mockean vacíos y no se asertan sus resultados agrupados.

**Siguiente capa de valor recomendada:** desacoplar `src/backend/server.js` (factory de Express) y
`bd.js` (inyección de la conexión SQLite) para poder cubrir el backend local, y extender la capa de
UI más allá del smoke (páginas reales, flujos de interacción). Ver `KNOWN_ISSUES.md` #8 y #9.

## Linter y formateo (ESLint 9 + Prettier, incremental)

Configurado en la rama `chore/tech-debt-foundations` (Fase 0, `KNOWN_ISSUES.md` #8):

- **ESLint 9 flat config** en `eslint.config.mjs` (package.json es CommonJS, por eso `.mjs`):
  reglas `recommended` (`@eslint/js`) + `eslint-plugin-react` (jsx-runtime) +
  `eslint-plugin-react-hooks` (recommended). `no-console` con `allow: ["error"]` para preservar los
  `console.error` obligatorios en bloques `catch`. `no-unused-vars` en modo `warn`. `react/jsx-uses-vars`
  en `error` sobre `**/*.{js,jsx,mjs}`: sin ella, todo componente importado para usarse solo como
  etiqueta JSX se reportaba como variable sin usar (564 warnings que no eran deuda real; hoy son 187).
  `languageOptions.globals` declara los constructores DOM que el código y las suites usan
  (`Event`, `CustomEvent`, `KeyboardEvent`, `MouseEvent`, `HTMLElement`, `HTMLButtonElement`) como
  `readonly`, para que crearlos en los tests no dispare `no-undef`; el resto de globals del DOM no
  se declara porque no se usan.
- **Prettier 3** con `.prettierrc.json` (2 espacios, comillas dobles —estilo dominante del repo—,
  `trailingComma: es5`, `lf`) y `.prettierignore` (`dist/`, `node_modules/`, `supabase/.temp/`,
  `supabase/functions/`).
- Scripts en `package.json`:
  - `npm run lint` — corre ESLint sobre el repo completo (la base de violaciones legacy es
    conocida y **no** se corrige en esta fase; solo archivos nuevos/modificados).
  - `npm run format` — `prettier --write .` (normalización opt-in).
  - `npm run format:check` — `prettier --check .`.
- **CI incremental:** el workflow `.github/workflows/ci.yml` corre ESLint y Prettier **únicamente
  sobre los archivos del diff** (`git diff --diff-filter=ACM` contra la base del PR/push, filtrado con
  `grep -E`, que es POSIX y está siempre disponible en el runner; una versión anterior usaba `rg` y no
  evaluaba nada). Así los archivos legacy sin formatear no rompen el pipeline; cualquier archivo nuevo
  o modificado queda obligado a cumplir el estándar. No hay husky ni lint-staged (decisión Fase 0).
- **Node requerido: `>=22.22.2`** (declarado en `engines` de `package.json` y usado por el CI).
  `jsdom@30`/`undici@8` exigen Node 22.22.2+ y `vitest@5` 22.12+; **Node 20 no funciona** (el
  worker de Vitest falla al cargar jsdom con `webidl.util.markAsUncloneable is not a function`).
  Alinear la versión local con el CI evita discrepancias.
