/**
 * customerDetailService.js
 * Servicio especializado en consultas a base de datos para la vista 360° de un cliente individual.
 */

import { supabase } from "../../../../../lib/supabaseClient";
import { calculateCustomerFavoriteProducts } from "./customersReportCalculationService";

/**
 * Consulta a profundidad el detalle 360° de un cliente específico
 */
export const fetchCustomerDetailReport = async (customerId) => {
  try {
    if (!customerId) return null;

    // 1. Datos del cliente
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (custErr) throw custErr;

    // 2. Historial de ventas del cliente (todas sus ventas cronológicas)
    const { data: sales, error: salesErr } = await supabase
      .from("sales")
      .select(`
        id,
        sale_date,
        subtotal,
        tax,
        total,
        discount_total,
        status,
        notes,
        branches:branch_id (
          id,
          name,
          timezone
        ),
        users:user_id (
          id,
          username
        )
      `)
      .eq("customer_id", customerId)
      .order("sale_date", { ascending: false });

    if (salesErr) throw salesErr;

    const salesList = sales || [];
    const saleIds = salesList.map((s) => s.id);

    // 3. Cargar detalles (productos) de cada venta
    let saleDetails = [];

    if (saleIds.length > 0) {
      const { data: detData, error: detErr } = await supabase
        .from("sale_details")
        .select(`
          id,
          sale_id,
          product_id,
          quantity,
          unit_price,
          discount_amount,
          total_price,
          products (
            id,
            name,
            barcode
          )
        `)
        .in("sale_id", saleIds);

      if (!detErr && detData) {
        saleDetails = detData;
      }
    }

    // Asociar productos a cada venta
    const salesWithItems = salesList.map((sale) => {
      const items = saleDetails.filter((d) => d.sale_id === sale.id);
      return {
        ...sale,
        items,
      };
    });

    // 4. Historial completo de movimientos de puntos del cliente
    let pointsLedger = [];
    try {
      const { data: pLedgerData, error: pointsErr } = await supabase
        .from("customer_points")
        .select(`
          id,
          points,
          movement_type,
          source,
          notes,
          created_at,
          related_sale_id,
          branches:branch_id (
            id,
            name
          ),
          users:user_id (
            id,
            username
          ),
          rewards:reward_id (
            id,
            name
          )
        `)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (!pointsErr && pLedgerData) {
        pointsLedger = pLedgerData;
      }
    } catch (pEx) {
      console.error("Error al cargar puntos de cliente:", pEx);
    }

    // 5. Delegar cálculo de productos favoritos al servicio de cálculo puro
    const favoriteProducts = calculateCustomerFavoriteProducts(saleDetails);

    return {
      customer,
      sales: salesWithItems,
      pointsLedger: pointsLedger || [],
      favoriteProducts,
    };
  } catch (err) {
    console.error("Error al obtener detalle 360 del cliente:", err);
    throw err;
  }
};
