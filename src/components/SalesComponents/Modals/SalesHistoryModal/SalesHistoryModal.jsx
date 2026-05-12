import React, { useEffect, useMemo, useState } from "react";
import styles from "./SalesHistoryModal.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import { useAuth } from "../../../../contexts/AuthContext";
import { useBranch } from "../../../../contexts/BranchContext";
import { buildTicketText } from "../../../../utils/ticketBuilder";
import { printTicket } from "../../../../utils/ticketPrinter";
import PartialReturnModal from "../PartialReturnModal/PartialReturnModal";

const TIME_ZONE = "America/Cancun";

const SalesHistoryModal = ({ isOpen, onClose, onSaleCancelled }) => {
  const { user } = useAuth();
  const { branch } = useBranch();

  const [searchFolio, setSearchFolio] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [cashierFilter, setCashierFilter] = useState("all");

  const [tickets, setTickets] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [cancelProcessing, setCancelProcessing] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [printProcessing, setPrintProcessing] = useState(false);

  const [cancelReason, setCancelReason] = useState("");
  const [refundMethodId, setRefundMethodId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [returnHistory, setReturnHistory] = useState([]);
  const [totalReturned, setTotalReturned] = useState(0);
  const [isPartialReturnOpen, setIsPartialReturnOpen] = useState(false);

  const CANCUN_OFFSET = "-05:00";

  const dayRange = useMemo(() => {
    const start = new Date(`${dateFilter}T00:00:00${CANCUN_OFFSET}`);
    const end = new Date(`${dateFilter}T23:59:59.999${CANCUN_OFFSET}`);

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, [dateFilter]);

  const hasPartialReturns = (ticket) =>
    Number(ticket?.totalReturned || 0) > 0 || (ticket?.returns?.length || 0) > 0;

  const getDerivedStatus = (ticket) => {
    const normalized = ticket?.status?.toLowerCase();

    if (normalized === "cancelled") return "cancelled";
    if (hasPartialReturns(ticket)) return "partial_return";
    if (normalized === "pending") return "pending";
    return "completed";
  };

  const getStatusConfig = (ticket) => {
    const derivedStatus = getDerivedStatus(ticket);

    const map = {
      completed: { label: "COMPLETADA", className: styles.statusCompleted },
      cancelled: { label: "CANCELADA", className: styles.statusCancelled },
      partial_return: {
        label: "DEVOLUCIÓN PARCIAL",
        className: styles.statusRefunded,
      },
      pending: { label: "PENDIENTE", className: styles.statusPending },
    };

    return map[derivedStatus] || {
      label: "SIN ESTADO",
      className: styles.statusDefault,
    };
  };

  const getTicketRowStatusClass = (ticket) => {
    const derivedStatus = getDerivedStatus(ticket);

    if (derivedStatus === "cancelled") return styles.ticketRowCancelled;
    if (derivedStatus === "partial_return") return styles.ticketRowRefunded;
    if (derivedStatus === "pending") return styles.ticketRowPending;
    return "";
  };

  const formatCurrency = (value) => {
    return `$${Number(value || 0).toFixed(2)}`;
  };

  const formatTime = (isoDate) => {
    if (!isoDate) return "";

    const date = new Date(isoDate);

    return date.toLocaleTimeString("es-MX", {
      timeZone: TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateTime = (isoDate) => {
    if (!isoDate) return "";

    const date = new Date(isoDate);

    return date.toLocaleString("es-MX", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getDisplayFolio = (sale) => {
    if (!sale?.id) return "";
    return sale.id.slice(0, 8).toUpperCase();
  };

  const getPaymentMethodLabel = (payments) => {
    if (!payments || payments.length === 0) return "SIN PAGOS";

    const methodNames = payments
      .map((p) => p.payment_method_name || p.paymentMethod)
      .filter(Boolean);

    if (methodNames.length === 0) return "SIN PAGOS";
    if (methodNames.length === 1) return methodNames[0].toUpperCase();
    return "MIXTO";
  };

  const getPaymentMethodNameById = (methodId) => {
    if (!methodId) return "";
    const found = paymentMethods.find((method) => method.id === methodId);
    return found?.name?.toUpperCase() || "";
  };

  const normalizeCurrency = (currency) => {
    const value = String(currency || "MXN").trim().toUpperCase();

    if (value === "USD" || value === "DOLARES" || value === "DÓLARES") {
      return "USD";
    }

    return "MXN";
  };

  const normalizePaymentMethodName = (name) => {
    return String(name || "").trim().toUpperCase();
  };

  const getPaymentSummary = (payments = [], total = 0) => {
    let cash = 0;
    let terminal = 0;
    let usd = 0;
    let usdToMxn = 0;
    let exchangeRate = 0;
    let mxnOther = 0;

    for (const payment of payments) {
      const amount = Number(payment.amount || 0);
      const currency = normalizeCurrency(payment.currency);
      const methodName = normalizePaymentMethodName(
        payment.paymentMethod || payment.payment_method_name
      );
      const rate = Number(payment.exchangeRate ?? payment.exchange_rate ?? 0);

      if (currency === "USD") {
        usd += amount;

        if (rate > 0) {
          exchangeRate = rate;
          usdToMxn += amount * rate;
        }

        continue;
      }

      if (methodName.includes("EFECTIVO")) {
        cash += amount;
      } else if (
        methodName.includes("TERMINAL") ||
        methodName.includes("TARJETA") ||
        methodName.includes("CARD")
      ) {
        terminal += amount;
      } else {
        mxnOther += amount;
      }
    }

    const amountReceived = cash + terminal + mxnOther + usdToMxn;
    const changeAmount = Math.max(amountReceived - Number(total || 0), 0);

    return {
      cash,
      terminal,
      usd,
      usdToMxn,
      exchangeRate,
      mxnOther,
      amountReceived,
      changeAmount,
    };
  };

  const buildTicketFromSaleRow = async (saleRow) => {
    const saleIds = [saleRow.id];
    const userIds = saleRow.user_id ? [saleRow.user_id] : [];
    const customerIds = saleRow.customer_id ? [saleRow.customer_id] : [];

    const [
      detailsRes,
      usersRes,
      customersRes,
      canceledRes,
      paymentsRes,
      returnsRes,
    ] = await Promise.all([
      supabase
        .from("sale_details")
        .select(`
          sale_id,
          quantity
        `)
        .in("sale_id", saleIds),

      userIds.length
        ? supabase
            .from("users")
            .select("id, username, email")
            .in("id", userIds)
        : Promise.resolve({ data: [], error: null }),

      customerIds.length
        ? supabase
            .from("customers")
            .select("id, name")
            .in("id", customerIds)
        : Promise.resolve({ data: [], error: null }),

      saleIds.length
        ? supabase
            .from("canceled_sales")
            .select("sale_id, cancel_reason, refund_method_id, created_at")
            .in("sale_id", saleIds)
        : Promise.resolve({ data: [], error: null }),

      supabase
        .from("sale_payments")
        .select(`
          sale_id,
          amount,
          currency,
          exchange_rate,
          payment_method_id,
          reference
        `)
        .in("sale_id", saleIds),

      saleIds.length
        ? supabase
            .from("sale_returns")
            .select(`
              id,
              sale_id,
              total_refund,
              refund_method_id,
              return_reason,
              created_at
            `)
            .in("sale_id", saleIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (detailsRes.error) throw detailsRes.error;
    if (usersRes.error) throw usersRes.error;
    if (customersRes.error) throw customersRes.error;
    if (canceledRes.error) throw canceledRes.error;
    if (paymentsRes.error) throw paymentsRes.error;
    if (returnsRes.error) throw returnsRes.error;

    const paymentMethodIds = [
      ...new Set(
        [
          ...(paymentsRes.data || []).map((p) => p.payment_method_id),
          ...(canceledRes.data || []).map((c) => c.refund_method_id),
          ...(returnsRes.data || []).map((r) => r.refund_method_id),
        ].filter(Boolean)
      ),
    ];

    const methodsRes = paymentMethodIds.length
      ? await supabase
          .from("payment_methods")
          .select("id, name")
          .in("id", paymentMethodIds)
      : { data: [], error: null };

    if (methodsRes.error) throw methodsRes.error;

    const detailCountBySale = {};
    for (const row of detailsRes.data || []) {
      detailCountBySale[row.sale_id] =
        (detailCountBySale[row.sale_id] || 0) + Number(row.quantity || 0);
    }

    const userMap = {};
    for (const row of usersRes.data || []) {
      userMap[row.id] = (row.username || row.email || "SIN NOMBRE").toUpperCase();
    }

    const customerMap = {};
    for (const row of customersRes.data || []) {
      customerMap[row.id] = row.name;
    }

    const methodMap = {};
    for (const row of methodsRes.data || []) {
      methodMap[row.id] = row.name;
    }

    const cancelInfoMap = {};
    for (const row of canceledRes.data || []) {
      cancelInfoMap[row.sale_id] = {
        cancelReason: row.cancel_reason || "",
        refundMethodId: row.refund_method_id || "",
        refundMethodName: methodMap[row.refund_method_id] || "",
        cancelledAt: row.created_at || null,
      };
    }

    const returnsBySale = {};
    for (const row of returnsRes.data || []) {
      if (!returnsBySale[row.sale_id]) {
        returnsBySale[row.sale_id] = [];
      }

      returnsBySale[row.sale_id].push({
        id: row.id,
        totalRefund: Number(row.total_refund || 0),
        refundMethodId: row.refund_method_id || "",
        refundMethodName: methodMap[row.refund_method_id] || "",
        returnReason: row.return_reason || "",
        createdAt: row.created_at || null,
      });
    }

    const payments = (paymentsRes.data || []).map((row) => ({
      ...row,
      reference: row.reference || "",
      payment_method_name: methodMap[row.payment_method_id] || "DESCONOCIDO",
    }));

    const cancelInfo = cancelInfoMap[saleRow.id] || {};
    const returns = returnsBySale[saleRow.id] || [];
    const totalReturnedAccum = returns.reduce(
      (acc, item) => acc + Number(item.totalRefund || 0),
      0
    );
    const paymentSummary = getPaymentSummary(payments, saleRow.total);

    return {
      id: saleRow.id,
      folio: getDisplayFolio(saleRow),
      articles: detailCountBySale[saleRow.id] || 0,
      time: formatTime(saleRow.sale_date),
      total: Number(saleRow.total || 0),
      subtotal: Number(saleRow.subtotal || 0),
      tax: Number(saleRow.tax || 0),
      discountTotal: Number(saleRow.discount_total || 0),
      cashier: userMap[saleRow.user_id] || "SIN CAJERO",
      client: customerMap[saleRow.customer_id] || "PÚBLICO EN GENERAL",
      date: saleRow.sale_date,
      paymentMethod: getPaymentMethodLabel(payments),
      status: saleRow.status || "",
      payments,
      notes: saleRow.notes || "",
      cancelReason: cancelInfo.cancelReason || "",
      refundMethodId: cancelInfo.refundMethodId || "",
      refundMethodName: cancelInfo.refundMethodName || "",
      cancelledAt: cancelInfo.cancelledAt || null,
      returns,
      totalReturned: totalReturnedAccum,
      netTotal: Math.max(Number(saleRow.total || 0) - totalReturnedAccum, 0),
      ...paymentSummary,
    };
  };

  const loadPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) throw error;

      setPaymentMethods(data || []);
    } catch (error) {
      console.error("Error cargando métodos de pago:", error);
    }
  };

  const loadCashiers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, email, status")
        .eq("status", true)
        .order("username", { ascending: true });

      if (error) throw error;

      const mappedCashiers = (data || []).map((u) => ({
        id: u.id,
        name: (u.username || u.email || "SIN NOMBRE").toUpperCase(),
      }));

      setCashiers(mappedCashiers);
    } catch (error) {
      console.error("Error cargando cajeros:", error);
      setCashiers([]);
    }
  };

  const loadTickets = async () => {
    if (!branch?.id || !isOpen) return;

    try {
      setLoadingTickets(true);

      let query = supabase
        .from("sales")
        .select(`
          id,
          sale_date,
          subtotal,
          tax,
          total,
          discount_total,
          status,
          user_id,
          customer_id,
          branch_id,
          notes
        `)
        .eq("branch_id", branch.id)
        .gte("sale_date", dayRange.start)
        .lte("sale_date", dayRange.end)
        .order("sale_date", { ascending: false });

      if (cashierFilter !== "all") {
        query = query.eq("user_id", cashierFilter);
      }

      const { data: salesRows, error: salesError } = await query;
      if (salesError) throw salesError;

      const sales = salesRows || [];
      const saleIds = sales.map((s) => s.id);
      const userIds = [...new Set(sales.map((s) => s.user_id).filter(Boolean))];
      const customerIds = [...new Set(
        sales.map((s) => s.customer_id).filter(Boolean)
      )];

      const [
        detailsRes,
        usersRes,
        customersRes,
        paymentsRes,
        canceledRes,
        returnsRes,
      ] = await Promise.all([
        saleIds.length
          ? supabase
              .from("sale_details")
              .select(`
                sale_id,
                quantity
              `)
              .in("sale_id", saleIds)
          : Promise.resolve({ data: [], error: null }),

        userIds.length
          ? supabase
              .from("users")
              .select("id, username, email")
              .in("id", userIds)
          : Promise.resolve({ data: [], error: null }),

        customerIds.length
          ? supabase
              .from("customers")
              .select("id, name")
              .in("id", customerIds)
          : Promise.resolve({ data: [], error: null }),

        saleIds.length
          ? supabase
              .from("sale_payments")
              .select(`
                sale_id,
                amount,
                currency,
                exchange_rate,
                payment_method_id,
                reference
              `)
              .in("sale_id", saleIds)
          : Promise.resolve({ data: [], error: null }),

        saleIds.length
          ? supabase
              .from("canceled_sales")
              .select("sale_id, cancel_reason, refund_method_id, created_at")
              .in("sale_id", saleIds)
          : Promise.resolve({ data: [], error: null }),

        saleIds.length
          ? supabase
              .from("sale_returns")
              .select(`
                id,
                sale_id,
                total_refund,
                refund_method_id,
                return_reason,
                created_at
              `)
              .in("sale_id", saleIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (detailsRes.error) throw detailsRes.error;
      if (usersRes.error) throw usersRes.error;
      if (customersRes.error) throw customersRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (canceledRes.error) throw canceledRes.error;
      if (returnsRes.error) throw returnsRes.error;

      const paymentMethodIds = [
        ...new Set(
          [
            ...(paymentsRes.data || []).map((p) => p.payment_method_id),
            ...(canceledRes.data || []).map((c) => c.refund_method_id),
            ...(returnsRes.data || []).map((r) => r.refund_method_id),
          ].filter(Boolean)
        ),
      ];

      const methodsRes = paymentMethodIds.length
        ? await supabase
            .from("payment_methods")
            .select("id, name")
            .in("id", paymentMethodIds)
        : { data: [], error: null };

      if (methodsRes.error) throw methodsRes.error;

      const detailCountBySale = {};
      for (const row of detailsRes.data || []) {
        detailCountBySale[row.sale_id] =
          (detailCountBySale[row.sale_id] || 0) + Number(row.quantity || 0);
      }

      const userMap = {};
      for (const row of usersRes.data || []) {
        userMap[row.id] = (row.username || row.email || "SIN NOMBRE").toUpperCase();
      }

      const customerMap = {};
      for (const row of customersRes.data || []) {
        customerMap[row.id] = row.name;
      }

      const methodMap = {};
      for (const row of methodsRes.data || []) {
        methodMap[row.id] = row.name;
      }

      const cancelInfoMap = {};
      for (const row of canceledRes.data || []) {
        cancelInfoMap[row.sale_id] = {
          cancelReason: row.cancel_reason || "",
          refundMethodId: row.refund_method_id || "",
          refundMethodName: methodMap[row.refund_method_id] || "",
          cancelledAt: row.created_at || null,
        };
      }

      const returnsBySale = {};
      for (const row of returnsRes.data || []) {
        if (!returnsBySale[row.sale_id]) {
          returnsBySale[row.sale_id] = [];
        }

        returnsBySale[row.sale_id].push({
          id: row.id,
          totalRefund: Number(row.total_refund || 0),
          refundMethodId: row.refund_method_id || "",
          refundMethodName: methodMap[row.refund_method_id] || "",
          returnReason: row.return_reason || "",
          createdAt: row.created_at || null,
        });
      }

      const paymentsBySale = {};
      for (const row of paymentsRes.data || []) {
        if (!paymentsBySale[row.sale_id]) {
          paymentsBySale[row.sale_id] = [];
        }

        paymentsBySale[row.sale_id].push({
          ...row,
          reference: row.reference || "",
          payment_method_name: methodMap[row.payment_method_id] || "DESCONOCIDO",
        });
      }

      const mappedTickets = sales.map((sale) => {
        const cancelInfo = cancelInfoMap[sale.id] || {};
        const payments = paymentsBySale[sale.id] || [];
        const returns = returnsBySale[sale.id] || [];
        const totalReturnedAccum = returns.reduce(
          (acc, item) => acc + Number(item.totalRefund || 0),
          0
        );
        const paymentSummary = getPaymentSummary(payments, sale.total);

        return {
          id: sale.id,
          folio: getDisplayFolio(sale),
          articles: detailCountBySale[sale.id] || 0,
          time: formatTime(sale.sale_date),
          total: Number(sale.total || 0),
          subtotal: Number(sale.subtotal || 0),
          tax: Number(sale.tax || 0),
          discountTotal: Number(sale.discount_total || 0),
          cashier: userMap[sale.user_id] || "SIN CAJERO",
          client: customerMap[sale.customer_id] || "PÚBLICO EN GENERAL",
          date: sale.sale_date,
          paymentMethod: getPaymentMethodLabel(payments),
          status: sale.status || "",
          payments,
          notes: sale.notes || "",
          cancelReason: cancelInfo.cancelReason || "",
          refundMethodId: cancelInfo.refundMethodId || "",
          refundMethodName: cancelInfo.refundMethodName || "",
          cancelledAt: cancelInfo.cancelledAt || null,
          returns,
          totalReturned: totalReturnedAccum,
          netTotal: Math.max(Number(sale.total || 0) - totalReturnedAccum, 0),
          ...paymentSummary,
        };
      });

      const filteredByFolio = mappedTickets.filter((ticket) =>
        ticket.folio.toLowerCase().includes(searchFolio.trim().toLowerCase())
      );

      setTickets(filteredByFolio);
    } catch (error) {
      console.error("Error cargando historial de ventas:", error);
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

const loadTicketDetail = async (ticket) => {
  if (!ticket?.id) return;

  try {
    setLoadingDetail(true);

    const [detailsRes, salePaymentsRes, kitItemsRes] = await Promise.all([
      supabase
        .from("sale_details")
        .select(`
          id,
          quantity,
          unit_price,
          total_price,
          product_id,
          original_unit_price,
          final_unit_price,
          discount_type,
          discount_value,
          discount_amount
        `)
        .eq("sale_id", ticket.id),

      supabase
        .from("sale_payments")
        .select(`
          id,
          amount,
          currency,
          exchange_rate,
          payment_method_id,
          reference
        `)
        .eq("sale_id", ticket.id),

      supabase
        .from("sale_kit_items")
        .select(`
          id,
          sale_id,
          sale_detail_id,
          kit_product_id,
          component_product_id,
          quantity
        `)
        .eq("sale_id", ticket.id),
    ]);

    if (detailsRes.error) throw detailsRes.error;
    if (salePaymentsRes.error) throw salePaymentsRes.error;
    if (kitItemsRes.error) throw kitItemsRes.error;

    const detailRows = detailsRes.data || [];
    const paymentRows = salePaymentsRes.data || [];
    const kitItemRows = kitItemsRes.data || [];

    const productIds = [
      ...new Set(
        [
          ...detailRows.map((d) => d.product_id),
          ...kitItemRows.map((k) => k.component_product_id),
        ].filter(Boolean)
      ),
    ];

    const paymentMethodIds = [
      ...new Set(paymentRows.map((p) => p.payment_method_id).filter(Boolean)),
    ];

    const [productsRes, methodsRes] = await Promise.all([
      productIds.length
        ? supabase
            .from("products")
            .select("id, name, barcode, is_kit")
            .in("id", productIds)
        : Promise.resolve({ data: [], error: null }),

      paymentMethodIds.length
        ? supabase
            .from("payment_methods")
            .select("id, name")
            .in("id", paymentMethodIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (productsRes.error) throw productsRes.error;
    if (methodsRes.error) throw methodsRes.error;

    const productMap = {};
    const productIsKitMap = {};

    for (const product of productsRes.data || []) {
      productMap[product.id] = product.name || product.barcode || "PRODUCTO";
      productIsKitMap[product.id] = !!product.is_kit;
    }

    const methodMap = {};
    for (const method of methodsRes.data || []) {
      methodMap[method.id] = method.name;
    }

    const kitItemsByDetail = {};

    for (const row of kitItemRows) {
      if (!kitItemsByDetail[row.sale_detail_id]) {
        kitItemsByDetail[row.sale_detail_id] = [];
      }

      kitItemsByDetail[row.sale_detail_id].push({
        id: row.id,
        productId: row.component_product_id,
        quantity: Number(row.quantity || 0),
        description: productMap[row.component_product_id] || "PRODUCTO",
      });
    }

    const items = detailRows.map((item) => {
      const components = kitItemsByDetail[item.id] || [];

      return {
        id: item.id,
        productId: item.product_id,
        cant: Number(item.quantity || 0),
        description: productMap[item.product_id] || "PRODUCTO",
        amount: Number(item.total_price || 0),
        unitPrice: Number(item.unit_price || 0),
        originalUnitPrice: Number(
          item.original_unit_price || item.unit_price || 0
        ),
        finalUnitPrice: Number(item.final_unit_price || item.unit_price || 0),
        discountAmount: Number(item.discount_amount || 0),
        discountValue: Number(item.discount_value || 0),
        discountType: item.discount_type || null,
        isKit: productIsKitMap[item.product_id] || components.length > 0,
        components,
      };
    });

    const payments = paymentRows.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount || 0),
      currency: payment.currency || "MXN",
      exchangeRate: Number(payment.exchange_rate || 0),
      reference: payment.reference || "",
      paymentMethod: (
        methodMap[payment.payment_method_id] || "DESCONOCIDO"
      ).toUpperCase(),
    }));

    const paymentMethodLabel =
      payments.length === 0
        ? "SIN PAGOS"
        : payments.length === 1
        ? payments[0].paymentMethod
        : "MIXTO";

    const paymentSummary = getPaymentSummary(payments, ticket.total);

    setSelectedTicket((prev) =>
      prev && prev.id === ticket.id
        ? {
            ...prev,
            items,
            payments,
            paymentMethod: paymentMethodLabel,
            ...paymentSummary,
          }
        : prev
    );
  } catch (error) {
    console.error("Error cargando detalle del ticket:", error);
  } finally {
    setLoadingDetail(false);
  }
};  

  const loadReturnData = async (saleId) => {
    try {
      const { data: returnsData, error: returnsError } = await supabase
        .from("sale_returns")
        .select(`
          id,
          sale_id,
          total_refund,
          refund_method_id,
          return_reason,
          created_at
        `)
        .eq("sale_id", saleId)
        .order("created_at", { ascending: false });

      if (returnsError) throw returnsError;

      const returnIds = (returnsData || []).map((r) => r.id);
      const methodIds = [
        ...new Set(
          (returnsData || []).map((r) => r.refund_method_id).filter(Boolean)
        ),
      ];

      const [itemsRes, methodsRes] = await Promise.all([
        returnIds.length
          ? supabase
              .from("sale_return_items")
              .select(`
                id,
                return_id,
                sale_detail_id,
                product_id,
                quantity,
                unit_price,
                total_price
              `)
              .in("return_id", returnIds)
          : Promise.resolve({ data: [], error: null }),

        methodIds.length
          ? supabase
              .from("payment_methods")
              .select("id, name")
              .in("id", methodIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (methodsRes.error) throw methodsRes.error;

      const productIds = [
        ...new Set((itemsRes.data || []).map((i) => i.product_id).filter(Boolean)),
      ];

      const productsRes = productIds.length
        ? await supabase
            .from("products")
            .select("id, name, barcode")
            .in("id", productIds)
        : { data: [], error: null };

      if (productsRes.error) throw productsRes.error;

      const methodMap = {};
      for (const method of methodsRes.data || []) {
        methodMap[method.id] = method.name;
      }

      const productMap = {};
      for (const product of productsRes.data || []) {
        productMap[product.id] = product.name || product.barcode || "PRODUCTO";
      }

      const itemsByReturn = {};
      for (const item of itemsRes.data || []) {
        if (!itemsByReturn[item.return_id]) {
          itemsByReturn[item.return_id] = [];
        }

        itemsByReturn[item.return_id].push({
          id: item.id,
          saleDetailId: item.sale_detail_id,
          productId: item.product_id,
          description: productMap[item.product_id] || "PRODUCTO",
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unit_price || 0),
          totalPrice: Number(item.total_price || 0),
        });
      }

      const mappedReturns = (returnsData || []).map((ret) => ({
        id: ret.id,
        totalRefund: Number(ret.total_refund || 0),
        refundMethodId: ret.refund_method_id || "",
        refundMethodName: methodMap[ret.refund_method_id] || "",
        returnReason: ret.return_reason || "",
        createdAt: ret.created_at || null,
        items: itemsByReturn[ret.id] || [],
      }));

      const totalReturnedAccum = mappedReturns.reduce(
        (acc, item) => acc + Number(item.totalRefund || 0),
        0
      );

      setReturnHistory(mappedReturns);
      setTotalReturned(totalReturnedAccum);

      setSelectedTicket((prev) =>
        prev && prev.id === saleId
          ? {
              ...prev,
              returns: mappedReturns,
              totalReturned: totalReturnedAccum,
              netTotal: Math.max(Number(prev.total || 0) - totalReturnedAccum, 0),
            }
          : prev
      );
    } catch (error) {
      console.error("Error cargando devoluciones:", error);
      setReturnHistory([]);
      setTotalReturned(0);
    }
  };

  const loadCancellationData = async (saleId) => {
    try {
      const { data, error } = await supabase
        .from("canceled_sales")
        .select("cancel_reason, refund_method_id, created_at")
        .eq("sale_id", saleId)
        .maybeSingle();

      if (error) throw error;

      const refundName = getPaymentMethodNameById(data?.refund_method_id);

      setCancelReason(data?.cancel_reason || "");
      setRefundMethodId(data?.refund_method_id || "");

      setSelectedTicket((prev) =>
        prev && prev.id === saleId
          ? {
              ...prev,
              cancelReason: data?.cancel_reason || "",
              refundMethodId: data?.refund_method_id || "",
              refundMethodName: refundName,
              cancelledAt: data?.created_at || null,
            }
          : prev
      );
    } catch (error) {
      console.error("Error cargando datos de cancelación:", error);
      setCancelReason("");
      setRefundMethodId("");
    }
  };

  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setIsNotesModalOpen(false);

    if (ticket.status?.toLowerCase() === "cancelled") {
      await loadCancellationData(ticket.id);
    } else {
      setCancelReason("");
      setRefundMethodId("");
    }

    await loadTicketDetail(ticket);
    await loadReturnData(ticket.id);
  };

  const handleCancelSale = async () => {
    if (!selectedTicket?.id) {
      alert("Selecciona una venta primero.");
      return;
    }

    if (selectedTicket.status?.toLowerCase() !== "completed") {
      alert("Solo se pueden cancelar ventas en estado COMPLETADA.");
      return;
    }

    if (Number(selectedTicket.totalReturned || 0) > 0) {
      alert(
        "Esta venta ya tiene devoluciones parciales registradas y ya no puede cancelarse."
      );
      return;
    }

    if (!cancelReason.trim()) {
      alert("Ingresa el motivo de cancelación.");
      return;
    }

    if (!refundMethodId) {
      alert("Selecciona el método con el que se canceló/reembolsó.");
      return;
    }

    if (!user?.id) {
      alert("No se detectó el usuario.");
      return;
    }

    if (!branch?.id) {
      alert("No se detectó la sucursal.");
      return;
    }

    const confirmed = window.confirm(
      `¿Seguro que deseas cancelar la venta ${selectedTicket.folio}?`
    );

    if (!confirmed) return;

    try {
      setCancelProcessing(true);

      const currentTicketId = selectedTicket.id;

      const { data, error } = await supabase.rpc("cancel_sale_transaction", {
        p_sale_id: currentTicketId,
        p_user_id: user.id,
        p_branch_id: branch.id,
        p_cancel_reason: cancelReason.trim(),
        p_refund_method_uuid: refundMethodId,
      });

      if (error) throw error;

      await loadTickets();

      const { data: refreshedSale, error: refreshedSaleError } = await supabase
        .from("sales")
        .select(`
          id,
          sale_date,
          subtotal,
          tax,
          total,
          discount_total,
          status,
          user_id,
          customer_id,
          branch_id,
          notes
        `)
        .eq("id", currentTicketId)
        .single();

      if (refreshedSaleError || !refreshedSale) {
        setSelectedTicket(null);
        setCancelReason("");
        setRefundMethodId("");
      } else {
        const rebuiltTicket = await buildTicketFromSaleRow(refreshedSale);
        setSelectedTicket(rebuiltTicket);
        await loadCancellationData(currentTicketId);
        await loadTicketDetail(rebuiltTicket);
        await loadReturnData(currentTicketId);
      }

      if (onSaleCancelled) {
        onSaleCancelled(data);
      }
    } catch (error) {
      console.error("Error cancelando venta:", error);
      alert(error.message || "No se pudo cancelar la venta.");
    } finally {
      setCancelProcessing(false);
    }
  };

  const handlePartialReturnCreated = async () => {
    if (!selectedTicket?.id) return;

    try {
      await loadTickets();

      const { data: refreshedSale, error: refreshedSaleError } = await supabase
        .from("sales")
        .select(`
          id,
          sale_date,
          subtotal,
          tax,
          total,
          discount_total,
          status,
          user_id,
          customer_id,
          branch_id,
          notes
        `)
        .eq("id", selectedTicket.id)
        .single();

      if (refreshedSaleError || !refreshedSale) {
        setSelectedTicket(null);
        setReturnHistory([]);
        setTotalReturned(0);
        return;
      }

      const rebuiltTicket = await buildTicketFromSaleRow(refreshedSale);
      setSelectedTicket(rebuiltTicket);
      await loadTicketDetail(rebuiltTicket);
      await loadReturnData(rebuiltTicket.id);
    } catch (error) {
      console.error("Error refrescando devolución parcial:", error);
      alert("La devolución se guardó, pero no se pudo refrescar el historial.");
    }
  };

const handlePrintCopy = async () => {
  if (!selectedTicket?.id) {
    alert("Selecciona una venta primero.");
    return;
  }

  if (loadingDetail) {
    alert("Espera a que termine de cargar el detalle del ticket.");
    return;
  }

  try {
    setPrintProcessing(true);

    const refundMethodName =
      selectedTicket.refundMethodName ||
      getPaymentMethodNameById(refundMethodId) ||
      "";

    const paymentSummary = getPaymentSummary(
      selectedTicket.payments || [],
      selectedTicket.total
    );

    const itemsForPrint = (selectedTicket.items || []).map((item) => ({
      quantity: item.cant,
      description: item.description,
      unit_price: item.finalUnitPrice || item.unitPrice,
      original_unit_price: item.originalUnitPrice || item.unitPrice,
      discount_amount: item.discountAmount || 0,
      line_total: item.amount,
      is_kit: !!item.isKit,
      components: (item.components || []).map((component) => ({
        quantity: component.quantity,
        description: component.description,
      })),
    }));

    const paymentsForPrint = (selectedTicket.payments || []).map((payment) => ({
      payment_method_name: payment.paymentMethod,
      amount: payment.amount,
      currency: payment.currency,
      exchange_rate: payment.exchangeRate,
      reference: payment.reference || "",
    }));

    const ticketText = buildTicketText({
      branch: {
        name: branch?.name || "SUCURSAL",
        phone: branch?.phone || "",
        address: branch?.address || "",
        city: branch?.city || "",
        state: branch?.state || "",
        postal_code: branch?.postal_code || branch?.zip_code || "",
      },
      sale: {
        folio: selectedTicket.folio,
        created_at: selectedTicket.date,
        subtotal: selectedTicket.subtotal,
        tax: selectedTicket.tax,
        discount_total: selectedTicket.discountTotal || 0,
        total: selectedTicket.total,
        amount_received: paymentSummary.amountReceived,
        change_amount: paymentSummary.changeAmount,
        payment_method: selectedTicket.paymentMethod,
        payments: paymentsForPrint,
        status: selectedTicket.status,
        notes: selectedTicket.notes || "",
        cancelled_at: selectedTicket.cancelledAt,
        cancellation_reason:
          selectedTicket.cancelReason || cancelReason || "SIN MOTIVO REGISTRADO",
        refund_method: refundMethodName,
        cashier_name: selectedTicket.cashier,
        total_returned: selectedTicket.totalReturned || 0,
        net_total: selectedTicket.netTotal || selectedTicket.total,
        returns: (selectedTicket.returns || []).map((ret) => ({
          total_refund: ret.totalRefund || 0,
          refund_method: ret.refundMethodName || "",
          return_reason: ret.returnReason || "",
          created_at: ret.createdAt || null,
          items: (ret.items || []).map((item) => ({
            quantity: item.quantity || 0,
            description: item.description || "PRODUCTO",
            total_price: item.totalPrice || 0,
          })),
        })),
      },
      items: itemsForPrint,
      cashierName: selectedTicket.cashier,
      footer: {
        line1: "Gracias por su compra",
        line2: "Agenda tu cita de baño",
        phone: "998 117 5387",
        returnPolicy: "Para cambios o devoluciones presentar ticket de compra",
      },
      isReprint: true,
      reprintedAt: new Date(),
    });

    const result = await printTicket(ticketText);

    if (!result?.success) {
      throw new Error(result?.message || "No se pudo imprimir la copia.");
    }

    alert("Copia del ticket generada correctamente.");
  } catch (error) {
    console.error("Error imprimiendo copia:", error);
    alert(error.message || "No se pudo imprimir la copia del ticket.");
  } finally {
    setPrintProcessing(false);
  }
};

  useEffect(() => {
    if (!isOpen) {
      setSelectedTicket(null);
      setSearchFolio("");
      setCashierFilter("all");
      setCancelReason("");
      setRefundMethodId("");
      setIsNotesModalOpen(false);
      setPrintProcessing(false);
      setReturnHistory([]);
      setTotalReturned(0);
      setIsPartialReturnOpen(false);
      return;
    }

    loadCashiers();
    loadPaymentMethods();
  }, [isOpen, branch?.id]);

  useEffect(() => {
    if (!isOpen || !branch?.id) return;
    loadTickets();
  }, [isOpen, branch?.id, dayRange.start, dayRange.end, cashierFilter, searchFolio]);

  if (!isOpen) return null;

  const statusConfig = getStatusConfig(selectedTicket);
  const saleStatus = selectedTicket?.status?.toLowerCase() || "";
  const isCancelled = getDerivedStatus(selectedTicket) === "cancelled";
  const isCompleted = saleStatus === "completed" && !isCancelled;
  const ticketHasReturns = hasPartialReturns(selectedTicket);

  const itemRowsWithLimits = (selectedTicket?.items || []).map((item) => {
    const returnedQty = (selectedTicket?.returns || []).reduce((acc, ret) => {
      const matched = (ret.items || []).filter(
        (ri) => ri.saleDetailId === item.id
      );
      return (
        acc +
        matched.reduce((sum, ri) => sum + Number(ri.quantity || 0), 0)
      );
    }, 0);

    const remainingQty = Math.max(Number(item.cant || 0) - returnedQty, 0);

    return {
      ...item,
      returnedQty,
      remainingQty,
    };
  });

  const totalUnitsStillInSale = itemRowsWithLimits.reduce(
    (acc, item) => acc + Number(item.remainingQty || 0),
    0
  );

  const maxUnitsAllowedInOperation = Math.max(totalUnitsStillInSale - 1, 0);

  const canOpenPartialReturn =
    !!selectedTicket &&
    !loadingDetail &&
    !isCancelled &&
    maxUnitsAllowedInOperation > 0;

  const paymentSummary = getPaymentSummary(
    selectedTicket?.payments || [],
    selectedTicket?.total || 0
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>HISTORIAL DE VENTAS</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.leftPanel}>
            <div className={styles.filtersContainer}>
              <div className={styles.filterGroup}>
                <input
                  type="text"
                  placeholder="🔍 Ingresa el folio del ticket"
                  value={searchFolio}
                  onChange={(e) => setSearchFolio(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Ventas del día:</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className={styles.dateInput}
                />
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Cajero:</label>
                <select
                  value={cashierFilter}
                  onChange={(e) => setCashierFilter(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="all">Todos los cajeros</option>
                  {cashiers.map((cashier) => (
                    <option key={cashier.id} value={cashier.id}>
                      {cashier.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.ticketListContainer}>
              <table className={styles.ticketTable}>
                <thead>
                  <tr>
                    <th className={styles.notesIndicatorHeader}></th>
                    <th>Folio</th>
                    <th>Artículos</th>
                    <th>Hora</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingTickets ? (
                    <tr>
                      <td colSpan="5" className={styles.textCenter}>
                        Cargando ventas...
                      </td>
                    </tr>
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan="5" className={styles.textCenter}>
                        No se encontraron ventas
                      </td>
                    </tr>
                  ) : (
                    tickets.map((ticket) => {
                      const ticketDerivedStatus = getDerivedStatus(ticket);

                      return (
                        <tr
                          key={ticket.id}
                          onClick={() => handleSelectTicket(ticket)}
                          className={`${styles.ticketRow} ${getTicketRowStatusClass(
                            ticket
                          )} ${
                            selectedTicket?.id === ticket.id
                              ? styles.ticketRowActive
                              : ""
                          }`}
                        >
                          <td
                            className={styles.notesIndicator}
                            title={[
                              ticketDerivedStatus === "cancelled"
                                ? `Cancelada: ${
                                    ticket.cancelReason || "Sin motivo registrado"
                                  }`
                                : "",
                              ticketDerivedStatus === "partial_return" &&
                              ticket.totalReturned > 0
                                ? `Devolución parcial: ${formatCurrency(
                                    ticket.totalReturned
                                  )}`
                                : "",
                              ticket.notes?.trim() ? ticket.notes : "",
                              ticket.payments?.some((p) => p.reference?.trim())
                                ? `Referencia: ${ticket.payments
                                    .filter((p) => p.reference?.trim())
                                    .map((p) => p.reference)
                                    .join(" / ")}`
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          >
                            <span className={styles.ticketIndicators}>
                              {ticketDerivedStatus === "cancelled" ? "✖" : ""}
                              {ticketDerivedStatus === "partial_return" ? "↩" : ""}
                              {ticket.notes?.trim() ? "📝" : ""}
                            </span>
                          </td>

                          <td>{ticket.folio}</td>
                          <td className={styles.textCenter}>{ticket.articles}</td>
                          <td className={styles.textCenter}>{ticket.time}</td>
                          <td className={styles.textRight}>
                            {formatCurrency(ticket.total)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.rightPanel}>
            {selectedTicket ? (
              <>
                <div className={styles.ticketDetailContainer}>
                  <div className={styles.ticketHeader}>
                    <div className={styles.ticketInfoRow}>
                      <span className={styles.ticketLabel}>Folio:</span>
                      <span className={styles.ticketFolio}>{selectedTicket.folio}</span>
                    </div>

                    <div className={styles.ticketInfoRow}>
                      <span className={styles.ticketLabel}>Cajero:</span>
                      <span>{selectedTicket.cashier}</span>
                    </div>

                    <div className={styles.ticketInfoRow}>
                      <span className={styles.ticketLabel}>Cliente:</span>
                      <span>{selectedTicket.client}</span>
                    </div>

                    <div className={styles.ticketInfoRow}>
                      <span className={styles.ticketLabel}>Estado:</span>
                      <span className={`${styles.statusBadge} ${statusConfig.className}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className={styles.ticketDate}>
                      {formatDateTime(selectedTicket.date)}
                    </div>
                  </div>

                  <div className={styles.paymentMethodContainer}>
                    <span className={styles.paymentMethodLabel}>Método de pago:</span>
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                      {selectedTicket.paymentMethod}
                    </span>
                  </div>

                  {selectedTicket?.payments?.some((p) => p.reference?.trim()) && (
                    <div className={styles.paymentMethodContainer}>
                      <span className={styles.paymentMethodLabel}>Referencia:</span>
                      <span className={`${styles.badge} ${styles.badgeInfo}`}>
                        {selectedTicket.payments
                          .filter((p) => p.reference?.trim())
                          .map((p) => p.reference)
                          .join(" / ")}
                      </span>
                    </div>
                  )}

                  {getDerivedStatus(selectedTicket) === "partial_return" && (
                    <div className={styles.partialReturnSummaryBox}>
                      <div className={styles.partialReturnSummaryRow}>
                        <span>Unidades actualmente en la venta:</span>
                        <strong>{totalUnitsStillInSale}</strong>
                      </div>
                      <div className={styles.partialReturnSummaryRow}>
                        <span>Máximo total que puedes devolver ahora:</span>
                        <strong>{maxUnitsAllowedInOperation}</strong>
                      </div>
                      <div className={styles.partialReturnSummaryRow}>
                        <span>Debe quedar al menos:</span>
                        <strong>1 unidad en el ticket</strong>
                      </div>
                    </div>
                  )}

                  <table className={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th>Cant.</th>
                        <th>Descripción</th>
                        <th>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingDetail ? (
                        <tr>
                          <td colSpan="3" className={styles.textCenter}>
                            Cargando detalle...
                          </td>
                        </tr>
                      ) : itemRowsWithLimits.length ? (
                        itemRowsWithLimits.map((item) => {
                          const maxReturnAllowed = Math.max(
                            Math.min(
                              Number(item.remainingQty || 0),
                              maxUnitsAllowedInOperation
                            ),
                            0
                          );

                          const isFullyReturned =
                            item.remainingQty === 0 && item.returnedQty > 0;

                          const isBlockedByRule =
                            item.remainingQty > 0 && maxReturnAllowed === 0;

                          return (
                            <tr
                              key={item.id}
                              className={
                                isFullyReturned || isBlockedByRule
                                  ? styles.returnedItemRow
                                  : ""
                              }
                            >
                              <td className={styles.textCenter}>
                                {item.cant}
                                {(item.returnedQty > 0 || isBlockedByRule) && (
                                  <div className={styles.returnedMeta}>
                                    {isFullyReturned ? (
                                      <span className={styles.fullyReturnedText}>
                                        DEVOLUCIÓN COMPLETA
                                      </span>
                                    ) : isBlockedByRule ? (
                                      <span className={styles.fullyReturnedText}>
                                        YA NO SE PUEDE DEVOLVER
                                      </span>
                                    ) : (
                                      <span className={styles.availableReturnText}>
                                        Puedes devolver hasta {maxReturnAllowed} pieza
                                        {maxReturnAllowed !== 1 ? "s" : ""}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td
                                className={
                                  isFullyReturned || isBlockedByRule
                                    ? styles.returnedItemText
                                    : ""
                                }
                              >
                                {item.description}
                              </td>

                              <td
                                className={`${styles.textRight} ${
                                  isFullyReturned || isBlockedByRule
                                    ? styles.returnedItemText
                                    : ""
                                }`}
                              >
                                {formatCurrency(item.amount)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="3" className={styles.textCenter}>
                            Sin detalle disponible
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className={styles.totalsContainer}>
                    <div className={styles.totalsContent}>
                      {(paymentSummary.cash > 0 ||
                        paymentSummary.terminal > 0 ||
                        paymentSummary.usd > 0 ||
                        paymentSummary.mxnOther > 0) && (
                        <div className={styles.summarySection}>
                          <div className={styles.summarySectionTitle}>
                            Desglose de pago
                          </div>

                          {paymentSummary.cash > 0 && (
                            <div className={styles.totalRow}>
                              <span className={styles.totalLabel}>
                                Pago con EFECTIVO:
                              </span>
                              <span className={styles.totalAmount}>
                                {formatCurrency(paymentSummary.cash)}
                              </span>
                            </div>
                          )}

                          {paymentSummary.terminal > 0 && (
                            <div className={styles.totalRow}>
                              <span className={styles.totalLabel}>
                                Pago con TERMINAL:
                              </span>
                              <span className={styles.totalAmount}>
                                {formatCurrency(paymentSummary.terminal)}
                              </span>
                            </div>
                          )}

                          {paymentSummary.usd > 0 && (
                            <div className={styles.totalRow}>
                              <span className={styles.totalLabel}>
                                Pago con DÓLARES:
                              </span>
                              <span className={styles.totalAmount}>
                                {formatCurrency(paymentSummary.usd)}
                              </span>
                            </div>
                          )}

                          {paymentSummary.mxnOther > 0 && (
                            <div className={styles.totalRow}>
                              <span className={styles.totalLabel}>
                                Otros pagos MXN:
                              </span>
                              <span className={styles.totalAmount}>
                                {formatCurrency(paymentSummary.mxnOther)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {(paymentSummary.usd > 0 ||
                        paymentSummary.amountReceived > 0 ||
                        paymentSummary.changeAmount >= 0) && (
                        <div className={styles.summarySection}>
                          <div className={styles.summarySectionTitle}>
                            Conversión y cobro
                          </div>

                          {paymentSummary.usd > 0 &&
                            paymentSummary.exchangeRate > 0 && (
                              <div className={styles.totalRow}>
                                <span className={styles.totalLabel}>T.C. USD:</span>
                                <span className={styles.totalAmount}>
                                  {formatCurrency(paymentSummary.exchangeRate)}
                                </span>
                              </div>
                            )}

                          {paymentSummary.usd > 0 && paymentSummary.usdToMxn > 0 && (
                            <div className={styles.totalRow}>
                              <span className={styles.totalLabel}>Eq. MXN USD:</span>
                              <span className={styles.totalAmount}>
                                {formatCurrency(paymentSummary.usdToMxn)}
                              </span>
                            </div>
                          )}

                          <div className={`${styles.totalRow} ${styles.highlightRow}`}>
                            <span className={styles.totalLabelBold}>Pago con:</span>
                            <span className={styles.totalAmountStrong}>
                              {formatCurrency(paymentSummary.amountReceived)}
                            </span>
                          </div>

                          <div className={`${styles.totalRow} ${styles.highlightRow}`}>
                            <span className={styles.totalLabelBold}>Cambio:</span>
                            <span className={styles.totalAmountStrong}>
                              {formatCurrency(paymentSummary.changeAmount)}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className={styles.summarySection}>
                        <div className={styles.summarySectionTitle}>
                          Resumen de venta
                        </div>

                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Subtotal:</span>
                          <span className={styles.totalAmount}>
                            {formatCurrency(selectedTicket.subtotal)}
                          </span>
                        </div>

                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Descuento:</span>
                          <span className={styles.totalAmount}>
                            -{formatCurrency(selectedTicket.discountTotal || 0)}
                          </span>
                        </div>

                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Impuesto:</span>
                          <span className={styles.totalAmount}>
                            {formatCurrency(selectedTicket.tax)}
                          </span>
                        </div>

                        <div className={`${styles.totalRow} ${styles.finalTotalRow}`}>
                          <span className={styles.totalLabelBold}>Total:</span>
                          <span className={styles.totalAmountFinal}>
                            {formatCurrency(selectedTicket.total)}
                          </span>
                        </div>

                        {selectedTicket.totalReturned > 0 && (
                          <>
                            <div className={styles.totalRow}>
                              <span className={styles.totalLabel}>
                                Devuelto acumulado:
                              </span>
                              <span className={styles.totalAmount}>
                                -{formatCurrency(selectedTicket.totalReturned)}
                              </span>
                            </div>

                            <div className={`${styles.totalRow} ${styles.finalTotalRow}`}>
                              <span className={styles.totalLabelBold}>
                                Neto actual:
                              </span>
                              <span className={styles.totalAmountFinal}>
                                {formatCurrency(selectedTicket.netTotal)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedTicket?.returns?.length > 0 && (
                    <div className={styles.totalsContainer}>
                      <div className={styles.totalsContent}>
                        <div className={styles.summarySection}>
                          <div className={styles.summarySectionTitle}>
                            Devoluciones parciales
                          </div>

                          {selectedTicket.returns.map((ret) => (
                            <div key={ret.id} className={styles.returnBlock}>
                              <div className={styles.totalRow}>
                                <span className={styles.totalLabel}>Fecha:</span>
                                <span className={styles.totalAmount}>
                                  {formatDateTime(ret.createdAt)}
                                </span>
                              </div>

                              <div className={styles.totalRow}>
                                <span className={styles.totalLabel}>
                                  Método devolución:
                                </span>
                                <span className={styles.totalAmount}>
                                  {ret.refundMethodName || "SIN MÉTODO"}
                                </span>
                              </div>

                              <div className={styles.totalRow}>
                                <span className={styles.totalLabel}>Motivo:</span>
                                <span className={styles.totalAmount}>
                                  {ret.returnReason || "Sin motivo"}
                                </span>
                              </div>

                              <div className={styles.totalRow}>
                                <span className={styles.totalLabel}>Monto devuelto:</span>
                                <span className={styles.totalAmount}>
                                  {formatCurrency(ret.totalRefund)}
                                </span>
                              </div>

                              {ret.items?.length > 0 && (
                                <div className={styles.returnItemsList}>
                                  {ret.items.map((item) => (
                                    <div key={item.id} className={styles.returnItemRow}>
                                      <span>
                                        {item.quantity} x {item.description}
                                      </span>
                                      <span>{formatCurrency(item.totalPrice)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={styles.filtersContainer}>
                    <div className={styles.filterGroup}>
                      <label className={styles.filterLabel}>
                        Motivo de cancelación:
                      </label>
                      <input
                        type="text"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className={styles.searchInput}
                        placeholder="Describe el motivo"
                        disabled={cancelProcessing || !isCompleted || ticketHasReturns}
                      />
                    </div>

                    <div className={styles.filterGroup}>
                      <label className={styles.filterLabel}>
                        Método de reembolso/cancelación:
                      </label>
                      <select
                        value={refundMethodId}
                        onChange={(e) => setRefundMethodId(e.target.value)}
                        className={styles.selectInput}
                        disabled={cancelProcessing || !isCompleted || ticketHasReturns}
                      >
                        <option value="">Selecciona un método</option>
                        {paymentMethods.map((method) => (
                          <option key={method.id} value={method.id}>
                            {method.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className={styles.actionButtons}>
                  <div className={styles.leftActions}>
                    <button
                      className={`${styles.actionBtn} ${styles.btnCancel}`}
                      onClick={handleCancelSale}
                      disabled={cancelProcessing || !isCompleted || ticketHasReturns}
                      title={
                        ticketHasReturns
                          ? "Esta venta ya tiene devoluciones parciales y ya no puede cancelarse"
                          : ""
                      }
                    >
                      🗑️ Cancelar Venta
                    </button>

                    <button
                      className={`${styles.actionBtn} ${styles.btnReturn}`}
                      onClick={() => setIsPartialReturnOpen(true)}
                      disabled={!canOpenPartialReturn}
                      title={
                        !selectedTicket
                          ? ""
                          : isCancelled
                          ? "No se puede devolver una venta cancelada"
                          : maxUnitsAllowedInOperation <= 0
                          ? "Debe quedar al menos 1 unidad en la venta"
                          : ""
                      }
                    >
                      ↩️ Devolución parcial
                    </button>

                    <button
                      className={`${styles.actionBtn} ${styles.btnInvoice}`}
                      disabled={!isCompleted}
                    >
                      📄 Facturar
                    </button>

                    <button
                      className={`${styles.actionBtn} ${styles.btnPrint}`}
                      onClick={handlePrintCopy}
                      disabled={printProcessing || loadingDetail || !selectedTicket}
                      title="Reimprime el ticket de esta venta"
                    >
                      {printProcessing ? "Imprimiendo..." : "🖨️ Imprimir copia"}
                    </button>

                    <button
                      className={`${styles.actionBtn} ${styles.btnNotes}`}
                      onClick={() => setIsNotesModalOpen(true)}
                      disabled={!selectedTicket?.notes?.trim()}
                    >
                      📝 Ver Notas
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                Selecciona un ticket para ver los detalles
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.closeFooterBtn} onClick={onClose}>
            ESC - Cerrar
          </button>
        </div>

        {isNotesModalOpen && selectedTicket && (
          <div className={styles.notesOverlay}>
            <div className={styles.notesModal}>
              <div className={styles.notesHeader}>
                <h3>Notas del ticket {selectedTicket.folio}</h3>
                <button
                  className={styles.notesClose}
                  onClick={() => setIsNotesModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className={styles.notesContent}>
                {selectedTicket.notes?.trim()
                  ? selectedTicket.notes
                  : "Esta venta no tiene notas registradas."}
              </div>

              <div className={styles.notesFooter}>
                <button
                  className={styles.closeFooterBtn}
                  onClick={() => setIsNotesModalOpen(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        <PartialReturnModal
          isOpen={isPartialReturnOpen}
          onClose={() => setIsPartialReturnOpen(false)}
          selectedTicket={selectedTicket}
          paymentMethods={paymentMethods}
          onReturnCreated={handlePartialReturnCreated}
        />
      </div>
    </div>
  );
};

export default SalesHistoryModal;