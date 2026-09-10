/**
 * customersReportCalculationService.js
 * Funciones de cálculo puro y agregación de métricas de clientes.
 */

/**
 * Calcula el saldo de puntos y totales acumulados por cliente a partir de filas de ledger
 */
export const calculatePointsByCustomer = (pointsRows = []) => {
  const pointsMap = {};

  for (const row of pointsRows) {
    const customerId = row.customer_id;
    if (!customerId) continue;

    if (!pointsMap[customerId]) {
      pointsMap[customerId] = {
        balance: 0,
        earned: 0,
        redeemed: 0,
      };
    }

    const movementType = String(row.movement_type || "").toLowerCase();
    const source = String(row.source || "").toLowerCase();
    const rawPoints = Number(row.points || 0);

    const isRedeem =
      movementType.includes("canje") ||
      movementType.includes("redeem") ||
      movementType.includes("used") ||
      movementType.includes("uso") ||
      movementType.includes("resta") ||
      source === "reward" ||
      rawPoints < 0;

    const absPoints = Math.abs(rawPoints);

    if (isRedeem) {
      pointsMap[customerId].balance -= absPoints;
      pointsMap[customerId].redeemed += absPoints;
    } else {
      pointsMap[customerId].balance += absPoints;
      pointsMap[customerId].earned += absPoints;
    }
  }

  return pointsMap;
};

/**
 * Agrupa y calcula métricas de ventas por cliente
 */
export const aggregateSalesByCustomer = (salesRows = []) => {
  const salesMap = {};

  for (const sale of salesRows) {
    const customerId = sale.customer_id;
    if (!customerId) continue;

    // Solo ventas válidas/completadas
    const status = String(sale.status || "").toLowerCase();
    if (status === "cancelled" || status === "cancelada") continue;

    if (!salesMap[customerId]) {
      salesMap[customerId] = {
        totalSpent: 0,
        totalDiscounts: 0,
        purchasesCount: 0,
        lastSaleDate: null,
        sales: [],
      };
    }

    const total = Number(sale.total) || 0;
    const discount = Number(sale.discount_total) || 0;
    const saleDate = sale.sale_date || sale.created_at;

    salesMap[customerId].totalSpent += total;
    salesMap[customerId].totalDiscounts += discount;
    salesMap[customerId].purchasesCount += 1;
    salesMap[customerId].sales.push(sale);

    if (
      !salesMap[customerId].lastSaleDate ||
      new Date(saleDate) > new Date(salesMap[customerId].lastSaleDate)
    ) {
      salesMap[customerId].lastSaleDate = saleDate;
    }
  }

  return salesMap;
};

/**
 * Calcula los KPIs globales del reporte de clientes
 */
export const calculateCustomersKpis = ({
  rankedCustomers = [],
  pointsRows = [],
  redemptionsRows = [],
}) => {
  let activeCustomersCount = 0;
  let totalSpentSum = 0;
  let totalPurchasesSum = 0;
  let atRiskCount = 0;

  for (const cust of rankedCustomers) {
    if (cust.purchasesCount > 0) {
      activeCustomersCount += 1;
      totalSpentSum += cust.totalSpent;
      totalPurchasesSum += cust.purchasesCount;
    }

    if (cust.riskInfo?.isRisk) {
      atRiskCount += 1;
    }
  }

  const averageTicket =
    totalPurchasesSum > 0 ? totalSpentSum / totalPurchasesSum : 0;
  const averageFrequency =
    activeCustomersCount > 0 ? totalPurchasesSum / activeCustomersCount : 0;

  // Saldo total de puntos en circulación acumulado
  let totalPointsBalance = 0;
  let totalPointsEarned = 0;
  let totalPointsRedeemed = 0;

  for (const cust of rankedCustomers) {
    if (cust.pointsBalance > 0) {
      totalPointsBalance += cust.pointsBalance;
    }
  }

  for (const row of pointsRows) {
    const rawPoints = Number(row.points || 0);
    const movementType = String(row.movement_type || "").toLowerCase();
    const source = String(row.source || "").toLowerCase();

    const isRedeem =
      movementType.includes("canje") ||
      movementType.includes("redeem") ||
      movementType.includes("used") ||
      movementType.includes("uso") ||
      movementType.includes("resta") ||
      source === "reward" ||
      rawPoints < 0;

    if (isRedeem) {
      totalPointsRedeemed += Math.abs(rawPoints);
    } else {
      totalPointsEarned += Math.abs(rawPoints);
    }
  }

  // Descuento total por recompensas
  let totalRewardsDiscount = 0;
  for (const red of redemptionsRows) {
    totalRewardsDiscount += Number(red.discount_amount || 0);
  }

  return {
    activeCustomersCount,
    totalSpentSum,
    averageTicket,
    averageFrequency,
    totalPointsBalance,
    totalPointsEarned,
    totalPointsRedeemed,
    totalRewardsDiscount,
    atRiskCount,
  };
};

/**
 * Agrupa los productos más comprados por clientes identificados
 * e incluye el listado detallado de clientes que los compraron
 */
export const aggregateTopProducts = (saleDetailsRows = [], customerMap = {}) => {
  const productsMap = {};

  for (const item of saleDetailsRows) {
    const productId = item.product_id;
    if (!productId) continue;

    const productName = item.products?.name || "Producto sin nombre";
    const barcode = item.products?.barcode || "S/C";
    const quantity = Number(item.quantity) || 0;
    const totalPrice = Number(item.total_price) || 0;
    const customerId = item.sales?.customer_id;
    const saleDate = item.sales?.sale_date || item.sales?.created_at;
    const saleId = item.sale_id || item.sales?.id;

    if (!productsMap[productId]) {
      productsMap[productId] = {
        productId,
        productName,
        barcode,
        quantity: 0,
        revenue: 0,
        saleIdsSet: new Set(),
        buyersMap: {},
      };
    }

    productsMap[productId].quantity += quantity;
    productsMap[productId].revenue += totalPrice;
    if (saleId) {
      productsMap[productId].saleIdsSet.add(saleId);
    }

    if (customerId) {
      if (!productsMap[productId].buyersMap[customerId]) {
        const custInfo = customerMap[customerId];
        productsMap[productId].buyersMap[customerId] = {
          id: customerId,
          name: custInfo?.name || "Cliente sin nombre",
          phone: custInfo?.phone || "",
          email: custInfo?.email || "",
          rfc: custInfo?.rfc || "",
          isBillingCustomer: custInfo?.is_billing_customer || false,
          isPointsCustomer: custInfo?.is_points_customer || false,
          quantity: 0,
          spent: 0,
          purchasesCount: 0,
          saleIdsSet: new Set(),
          lastPurchaseDate: null,
        };
      }

      const buyer = productsMap[productId].buyersMap[customerId];
      buyer.quantity += quantity;
      buyer.spent += totalPrice;
      if (saleId) {
        buyer.saleIdsSet.add(saleId);
      }
      buyer.purchasesCount = buyer.saleIdsSet.size > 0 ? buyer.saleIdsSet.size : (buyer.purchasesCount + 1);

      if (
        saleDate &&
        (!buyer.lastPurchaseDate || new Date(saleDate) > new Date(buyer.lastPurchaseDate))
      ) {
        buyer.lastPurchaseDate = saleDate;
      }
    }
  }

  return Object.values(productsMap)
    .map((p) => {
      const buyers = Object.values(p.buyersMap)
        .map((b) => ({
          ...b,
          ticketsCount: b.saleIdsSet && b.saleIdsSet.size > 0 ? b.saleIdsSet.size : b.purchasesCount,
        }))
        .sort((a, b) => b.quantity - a.quantity || b.spent - a.spent);

      const ticketsCount = p.saleIdsSet ? p.saleIdsSet.size : 0;
      const avgPrice = p.quantity > 0 ? p.revenue / p.quantity : 0;

      return {
        productId: p.productId,
        productName: p.productName,
        barcode: p.barcode,
        quantity: p.quantity,
        revenue: p.revenue,
        ticketsCount,
        avgPrice,
        uniqueCustomersCount: buyers.length,
        buyers,
      };
    })
    .sort((a, b) => b.quantity - a.quantity);
};

/**
 * Agrupa y calcula los productos favoritos o más consumidos por un cliente individual
 */
export const calculateCustomerFavoriteProducts = (saleDetails = []) => {
  const productFrequencyMap = {};

  for (const d of saleDetails) {
    const pId = d.product_id;
    if (!pId) continue;

    if (!productFrequencyMap[pId]) {
      productFrequencyMap[pId] = {
        productId: pId,
        productName: d.products?.name || "Producto sin nombre",
        barcode: d.products?.barcode || "S/C",
        totalQuantity: 0,
        totalSpent: 0,
        purchasesCount: 0,
        lastBoughtDate: null,
      };
    }

    productFrequencyMap[pId].totalQuantity += Number(d.quantity || 0);
    productFrequencyMap[pId].totalSpent += Number(d.total_price || 0);
    productFrequencyMap[pId].purchasesCount += 1;
  }

  return Object.values(productFrequencyMap).sort(
    (a, b) => b.totalQuantity - a.totalQuantity
  );
};

