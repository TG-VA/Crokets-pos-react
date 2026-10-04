/**
 * profitabilityReportCalculationService.js
 * Funciones de cálculo puro y agregaciones matemáticas para el Reporte de Rentabilidad.
 */

import { getMarginClassification } from "../utils/profitabilityReportFormatters";

/**
 * Origen del costo unitario resuelto para una partida, del mas fuerte al mas
 * debil. Se expone en el item agregado para que el reporte distinga el costo
 * congelado en la venta del costo reconstruido.
 */
export const COST_SOURCE = {
  /** R1: suma del costo de los componentes del kit en `product_kit_items`. */
  KIT_COMPONENTS: "kit_components",
  /** Snapshot congelado en `sale_details.cost_price` al momento de la venta. */
  SALE_DETAIL_SNAPSHOT: "sale_detail_snapshot",
  /** Sin snapshot: se usa el CPP vigente de `branch_inventory`. */
  BRANCH_INVENTORY: "branch_inventory",
  /** Sin snapshot ni fila de inventario: se hereda el catalogo. */
  PRODUCT_CATALOG: "product_catalog",
  /** Ninguna fuente devolvio un costo utilizable. */
  UNRESOLVED: "unresolved",
};

/**
 * Coercion defensiva del costo a un numero finito y no negativo (decision R2 de
 * auditoria). Un `NaN`, un `Infinity` o un `null` colapsan a 0 para que un dato
 * sucio no pueda producir un `NaN` propagado hasta el margen.
 *
 * @param {unknown} value
 * @returns {number}
 */
const toNonNegativeNumber = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 0;

  return Math.max(0, parsed);
};

/**
 * Resuelve el costo unitario de una partida de venta.
 *
 * **Prioridad 1, snapshot congelado.** `sale_details.cost_price` es el costo que
 * la RPC congelo al ejecutar la venta. Es la unica fuente que no puede cambiar
 * despues: si hoy se reporta contra el costo vivo, un reprecio posterior
 * reescribe el margen de una venta ya cerrada y falsea los estados financieros.
 *
 * **Prioridad 2, fallback para el historico sin backfill.** Deliberadamente **no**
 * se hizo backfill: rellenar el snapshot con el catalogo vigente fabricaria un
 * costo que no era el de la venta. Las partidas anteriores conservan
 * `cost_price = 0` (costo desconocido, no costo cero) y se reconstruyen con
 * `branch_inventory` y, en su defecto, el catalogo, que es lo unico disponible.
 * Es un costo estimado y se etiqueta como tal.
 *
 * **KITS por R1.** `create_kit_transaction` inserta las lineas de kit con
 * `cost_price = 0` hardcodeado, sin fila en `branch_inventory` y con
 * `tracks_inventory = false`: el snapshot del kit no es informacion de costo, es
 * un cero por diseno. Consumirlo dejaria los kits con costo 0, margen cercano al
 * 100 % inflado y falso, y `hasCostAssigned` pasaria a `false` sin que el error
 * fuera visible. Por eso los kits se resuelven por la suma de sus componentes,
 * que es la valuacion vigente y además real (no estimada).
 *
 * @param {object} params
 * @param {unknown} params.item Partida de `sale_details` ya consultada.
 * @param {string|null} params.branchId Sucursal de la venta.
 * @param {string} params.productId
 * @param {object} params.productInfo Fila del catalogo (o `item.products`).
 * @param {object} params.branchInventoryMap Mapa `sucursal_producto` -> fila.
 * @returns {{ unitCost: number, costSource: string, isCostEstimated: boolean }}
 */
export const resolveSaleDetailUnitCost = ({
  item,
  branchId,
  productId,
  productInfo,
  branchInventoryMap,
}) => {
  const snapshotCost = toNonNegativeNumber(item?.cost_price);

  if (snapshotCost > 0) {
    return {
      unitCost: snapshotCost,
      costSource: COST_SOURCE.SALE_DETAIL_SNAPSHOT,
      isCostEstimated: false,
    };
  }

  const branchInvKey = branchId ? `${branchId}_${productId}` : null;

  const branchInventoryCost = branchInvKey
    ? branchInventoryMap?.[branchInvKey]?.cost_price
    : undefined;

  if (branchInventoryCost !== undefined && branchInventoryCost !== null) {
    return {
      unitCost: toNonNegativeNumber(branchInventoryCost),
      costSource: COST_SOURCE.BRANCH_INVENTORY,
      isCostEstimated: true,
    };
  }

  if (
    productInfo?.cost_price !== undefined &&
    productInfo?.cost_price !== null
  ) {
    return {
      unitCost: toNonNegativeNumber(productInfo.cost_price),
      costSource: COST_SOURCE.PRODUCT_CATALOG,
      isCostEstimated: true,
    };
  }

  return {
    unitCost: 0,
    costSource: COST_SOURCE.UNRESOLVED,
    isCostEstimated: true,
  };
};

/**
 * Agrega y calcula la rentabilidad detallada por producto a partir de los detalles de venta
 */
export const aggregateProductsProfitability = ({
  saleDetails = [],
  salesMap = {},
  branchInventoryMap = {},
  productsMap = {},
  departmentsMap = {},
  kitsMap = {},
}) => {
  const productAggMap = {};

  for (const item of saleDetails) {
    const productId = item.product_id;
    if (!productId) continue;

    const sale = salesMap[item.sale_id] || {};
    const branchId = sale.branch_id;

    // Obtener información del catálogo de productos y configuración de kit
    const productInfo = productsMap[productId] || item.products || {};
    const isKit = Boolean(productInfo.is_kit || kitsMap[productId]);
    const kitConfig = kitsMap[productId];
    const kitComponents = kitConfig?.product_kit_items || [];
    const kitComponentsCount = kitComponents.length;

    let departmentId =
      productInfo.department_id || productInfo.departments?.id || null;
    let departmentName =
      (departmentId && departmentsMap[departmentId]?.name) ||
      productInfo.departments?.name ||
      null;

    if (!departmentName) {
      departmentName = isKit ? "Kits y Promociones" : "Sin Departamento";
      if (isKit && !departmentId) {
        departmentId = "KIT_PROMO";
      }
    }

    // Determinar costo unitario aplicable
    // 1. Si es un KIT: sumar el costo de cada componente en la sucursal de la venta (R1)
    // 2. Si es producto individual: consumir el snapshot congelado de la venta y,
    //    solo si no existe, reconstruirlo con branch_inventory o el catalogo.
    let unitCost = 0;
    let costSource = COST_SOURCE.UNRESOLVED;
    let isCostEstimated = true;
    const kitComponentsDetails = [];

    if (isKit && kitComponents.length > 0) {
      for (const comp of kitComponents) {
        const compId = comp.component_product_id;
        const compQty = Number(comp.quantity || 1);
        const compProduct = productsMap[compId] || {};
        const compBranchKey = branchId ? `${branchId}_${compId}` : null;
        let compUnitCost = 0;
        if (
          compBranchKey &&
          branchInventoryMap[compBranchKey]?.cost_price !== undefined
        ) {
          compUnitCost = Number(
            branchInventoryMap[compBranchKey].cost_price || 0
          );
        } else if (productsMap[compId]?.cost_price !== undefined) {
          compUnitCost = Number(productsMap[compId].cost_price || 0);
        }
        const compLineCost = compUnitCost * compQty;
        unitCost += compLineCost;

        kitComponentsDetails.push({
          componentId: compId,
          barcode: compProduct.barcode || "S/C",
          name: compProduct.name || "Producto componente",
          quantity: compQty,
          unitCost: compUnitCost,
          totalCost: compLineCost,
        });
      }

      // El costo del kit no es una reconstruccion: sale de la configuracion viva
      // de sus componentes, asi que no se marca como estimado.
      costSource = COST_SOURCE.KIT_COMPONENTS;
      isCostEstimated = false;
    } else {
      const resolved = resolveSaleDetailUnitCost({
        item,
        branchId,
        productId,
        productInfo,
        branchInventoryMap,
      });

      unitCost = resolved.unitCost;
      costSource = resolved.costSource;
      isCostEstimated = resolved.isCostEstimated;
    }

    const quantity = Number(item.quantity || 0);
    const revenue = Number(item.total_price || 0);
    const lineCost = unitCost * quantity;

    if (!productAggMap[productId]) {
      productAggMap[productId] = {
        productId,
        productName: productInfo.name || "Producto sin nombre",
        barcode: productInfo.barcode || "S/C",
        departmentId,
        departmentName,
        isKit,
        kitComponentsCount,
        kitComponentsDetails,
        totalUnits: 0,
        totalRevenue: 0,
        totalCost: 0,
        grossProfit: 0,
        grossMarginPercent: 0,
        averageSalePrice: 0,
        averageCostPrice: unitCost,
        ticketsCount: 0,
        hasCostAssigned: unitCost > 0,
        redeemedUnits: 0,
        costSource,
        // El costo congelado es el unico que no es una reconstruccion. Basta una
        // linea con snapshot para que el costo promedio del producto sea real;
        // si todas las linhas cayeron al fallback, el promedio es estimado.
        hasFrozenCost: costSource === COST_SOURCE.SALE_DETAIL_SNAPSHOT,
        isCostEstimated,
      };
    } else if (
      isKit &&
      !productAggMap[productId].kitComponentsDetails?.length
    ) {
      productAggMap[productId].kitComponentsDetails = kitComponentsDetails;
    }

    const agg = productAggMap[productId];

    agg.totalUnits += quantity;
    agg.totalRevenue += revenue;
    agg.totalCost += lineCost;
    agg.ticketsCount += 1;
    if (revenue === 0 && quantity > 0) {
      agg.redeemedUnits += quantity;
    }
    if (unitCost > 0) {
      agg.hasCostAssigned = true;
    }
    if (costSource === COST_SOURCE.SALE_DETAIL_SNAPSHOT) {
      agg.hasFrozenCost = true;
      agg.isCostEstimated = false;
    }
  }

  // Finalizar cálculos derivados por cada producto
  const productsList = Object.values(productAggMap).map((p) => {
    const grossProfit = p.totalRevenue - p.totalCost;
    const grossMarginPercent =
      p.totalRevenue > 0 ? (grossProfit / p.totalRevenue) * 100 : 0;
    const averageSalePrice =
      p.totalUnits > 0 ? p.totalRevenue / p.totalUnits : 0;
    const averageCostPrice = p.totalUnits > 0 ? p.totalCost / p.totalUnits : 0;

    const isPureReward = p.totalRevenue === 0 && p.totalUnits > 0;
    const hasPartialReward = p.redeemedUnits > 0 && p.totalRevenue > 0;

    const marginClassification = getMarginClassification(grossMarginPercent, {
      isPureReward,
    });

    return {
      ...p,
      grossProfit,
      grossMarginPercent,
      averageSalePrice,
      averageCostPrice,
      marginClassification,
      isPureReward,
      hasPartialReward,
      isLoss: marginClassification.isLoss,
      isCritical: marginClassification.isCritical,
    };
  });

  // Ordenar inicialmente por Utilidad Bruta ($) de mayor a menor
  return productsList.sort((a, b) => b.grossProfit - a.grossProfit);
};

/**
 * Agrupa y consolida la rentabilidad por departamento
 */
export const aggregateDepartmentsProfitability = ({
  productsProfitabilityList = [],
  departmentsMap = {},
  totalBusinessProfit = 0,
}) => {
  const deptMap = {};

  for (const p of productsProfitabilityList) {
    const deptId = p.departmentId || "UNCATEGORIZED";
    const deptName = p.departmentName || "Sin Departamento";

    if (!deptMap[deptId]) {
      deptMap[deptId] = {
        departmentId: deptId,
        departmentName: deptName,
        productsCount: 0,
        totalUnits: 0,
        totalRevenue: 0,
        totalCost: 0,
        grossProfit: 0,
        grossMarginPercent: 0,
        contributionPercent: 0,
      };
    }

    deptMap[deptId].productsCount += 1;
    deptMap[deptId].totalUnits += p.totalUnits;
    deptMap[deptId].totalRevenue += p.totalRevenue;
    deptMap[deptId].totalCost += p.totalCost;
    deptMap[deptId].grossProfit += p.grossProfit;
  }

  const deptList = Object.values(deptMap).map((d) => {
    const grossMarginPercent =
      d.totalRevenue > 0 ? (d.grossProfit / d.totalRevenue) * 100 : 0;
    const contributionPercent =
      totalBusinessProfit > 0 ? (d.grossProfit / totalBusinessProfit) * 100 : 0;

    const marginClassification = getMarginClassification(grossMarginPercent);

    return {
      ...d,
      grossMarginPercent,
      contributionPercent,
      marginClassification,
    };
  });

  // Ordenar departamentos por Utilidad Bruta ($) descendente
  return deptList.sort((a, b) => b.grossProfit - a.grossProfit);
};

/**
 * Calcula los KPIs globales del reporte de rentabilidad
 */
export const calculateProfitabilityKpis = ({
  productsProfitabilityList = [],
  totalSalesCount = 0,
}) => {
  let totalRevenue = 0;
  let totalCost = 0;
  let totalUnitsSold = 0;
  let criticalProductsCount = 0;
  let lossProductsCount = 0;

  for (const p of productsProfitabilityList) {
    totalRevenue += p.totalRevenue;
    totalCost += p.totalCost;
    totalUnitsSold += p.totalUnits;

    if (p.isCritical) {
      criticalProductsCount += 1;
    }
    if (p.isLoss) {
      lossProductsCount += 1;
    }
  }

  const grossProfit = totalRevenue - totalCost;
  const grossMarginPercent =
    totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const markupPercent = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;

  return {
    totalRevenue,
    totalCost,
    grossProfit,
    grossMarginPercent,
    markupPercent,
    totalUnitsSold,
    totalProductsSold: productsProfitabilityList.length,
    criticalProductsCount,
    lossProductsCount,
    totalSalesCount,
  };
};
