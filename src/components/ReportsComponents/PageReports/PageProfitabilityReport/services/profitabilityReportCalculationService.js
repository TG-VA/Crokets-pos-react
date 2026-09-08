/**
 * profitabilityReportCalculationService.js
 * Funciones de cálculo puro y agregaciones matemáticas para el Reporte de Rentabilidad.
 */

import { getMarginClassification } from "../utils/profitabilityReportFormatters";

/**
 * Agrupa y calcula la rentabilidad detallada por producto a partir de los detalles de venta
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

    let departmentId = productInfo.department_id || (productInfo.departments?.id) || null;
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
    // 1. Si es un KIT: Sumar el costo de cada componente en la sucursal de la venta
    // 2. Si es producto individual:
    //    - Prioridad: branch_inventory.cost_price de la sucursal
    //    - Fallback: products.cost_price del catálogo
    let unitCost = 0;
    const kitComponentsDetails = [];
    if (isKit && kitComponents.length > 0) {
      for (const comp of kitComponents) {
        const compId = comp.component_product_id;
        const compQty = Number(comp.quantity || 1);
        const compProduct = productsMap[compId] || {};
        const compBranchKey = branchId ? `${branchId}_${compId}` : null;
        let compUnitCost = 0;
        if (compBranchKey && branchInventoryMap[compBranchKey]?.cost_price !== undefined) {
          compUnitCost = Number(branchInventoryMap[compBranchKey].cost_price || 0);
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
    } else {
      const branchInvKey = branchId ? `${branchId}_${productId}` : null;
      if (branchInvKey && branchInventoryMap[branchInvKey]?.cost_price !== undefined) {
        unitCost = Number(branchInventoryMap[branchInvKey].cost_price || 0);
      } else if (productInfo.cost_price !== undefined) {
        unitCost = Number(productInfo.cost_price || 0);
      }
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
      };
    } else if (isKit && !productAggMap[productId].kitComponentsDetails?.length) {
      productAggMap[productId].kitComponentsDetails = kitComponentsDetails;
    }

    productAggMap[productId].totalUnits += quantity;
    productAggMap[productId].totalRevenue += revenue;
    productAggMap[productId].totalCost += lineCost;
    productAggMap[productId].ticketsCount += 1;
    if (revenue === 0 && quantity > 0) {
      productAggMap[productId].redeemedUnits += quantity;
    }
    if (unitCost > 0) {
      productAggMap[productId].hasCostAssigned = true;
    }
  }

  // Finalizar cálculos derivados por cada producto
  const productsList = Object.values(productAggMap).map((p) => {
    const grossProfit = p.totalRevenue - p.totalCost;
    const grossMarginPercent =
      p.totalRevenue > 0 ? (grossProfit / p.totalRevenue) * 100 : 0;
    const averageSalePrice =
      p.totalUnits > 0 ? p.totalRevenue / p.totalUnits : 0;
    const averageCostPrice =
      p.totalUnits > 0 ? p.totalCost / p.totalUnits : 0;

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
      totalBusinessProfit > 0
        ? (d.grossProfit / totalBusinessProfit) * 100
        : 0;

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
  const markupPercent =
    totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;

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
