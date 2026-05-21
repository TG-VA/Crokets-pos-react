import React, { useState, useRef, useCallback, useEffect } from "react";
import styles from "../../pages/Sales/Sales.module.css";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useBranch } from "../../contexts/BranchContext";
import { v4 as uuidv4 } from "uuid";
import { buildTicketText } from "../../utils/ticketBuilder";
import { printTicket } from "../../utils/ticketPrinter";

// Importar iconos
import searchIcon from "../../assets/icons/searchIcon.svg";
import entryIcon from "../../assets/icons/entryIcon.svg";
import exitIcon from "../../assets/icons/exitIcon.svg";
import deleteIcon from "../../assets/icons/deleteIcon.svg";
import verifyIcon from "../../assets/icons/verifyIcon.svg";
import changeIcon from "../../assets/icons/changeIcon.svg";
import assignClientIcon from "../../assets/icons/assignClientIcon.svg";
import payIcon from "../../assets/icons/payIcon.svg";
import DiscountIcon from "../../assets/icons/percent-solid-full.svg";
import SalesHistoryIcon from "../../assets/icons/table-list-solid-full.svg";

// Importar componentes de modales
import ExitModal from "../../components/SalesComponents/Modals/ExitModal/ExitModal";
import EntryModal from "../../components/SalesComponents/Modals/EntryModal/EntryModal";
import PaymentModal from "../../components/SalesComponents/Modals/PaymentModal/PaymentModal";
import ClientModal from "../../components/SalesComponents/Modals/ClientModal/ClientModal";
import VerifierModal from "../../components/SalesComponents/Modals/VerifierModal/VerifierModal";
import SearchModal from "../../components/SalesComponents/Modals/SearchModal/SearchModal";
import DiscountModal from "../../components/SalesComponents/Modals/DiscountModal/DiscountModal";
import PendingTicketModal from "../../components/SalesComponents/Modals/PendingTicketModal/PendingTicketModal";
import ChangeTicketModal from "../../components/SalesComponents/Modals/ChangeTicketModal/ChangeTicketModal";
import DeleteTicketModal from "../../components/SalesComponents/Modals/DeleteTicketModal/DeleteTicketModal";
import DeleteItemModal from "../../components/SalesComponents/Modals/DeleteItemModal/DeleteItemModal";
import SalesHistoryModal from "../../components/SalesComponents/Modals/SalesHistoryModal/SalesHistoryModal";

const Sales = () => {
  const { user } = useAuth();
  const { branch } = useBranch();

  const [saleToken, setSaleToken] = useState(null);
  const [saleNotes, setSaleNotes] = useState("");
  const [ticketNumber, setTicketNumber] = useState(1);
  const [pendingTickets, setPendingTickets] = useState([]);
  const [barcode, setBarcode] = useState("");

  const MIN_COLUMN_WIDTH = 80;
  const [columnWidths, setColumnWidths] = useState([400, 150, 80, 150, 150]);
  const [isInitialized, setIsInitialized] = useState(false);

  const resizeRef = useRef({
    isResizing: false,
    columnIndex: -1,
    startX: 0,
    startWidth: 0,
    nextStartWidth: 0,
  });

  const tableRef = useRef(null);

  const [isExitModalOpen, setExitModalOpen] = useState(false);
  const [isEntryModalOpen, setEntryModalOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [isVerifierModalOpen, setVerifierModalOpen] = useState(false);
  const [isSearchModalOpen, setSearchModalOpen] = useState(false);
  const [isDiscountModalOpen, setDiscountModalOpen] = useState(false);
  const [isPendingModalOpen, setPendingModalOpen] = useState(false);
  const [isChangeModalOpen, setChangeModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDeleteItemModalOpen, setDeleteItemModalOpen] = useState(false);
  const [isSalesHistoryModalOpen, setSalesHistoryModalOpen] = useState(false);

  const [cashMovements, setCashMovements] = useState([]);
  const [currentSaleClient, setCurrentSaleClient] = useState(null);
  const [processingSale, setProcessingSale] = useState(false);
  const [shiftAlreadyCut, setShiftAlreadyCut] = useState(false);

  const [productos, setProductos] = useState([]);
  const [stockWarningMsg, setStockWarningMsg] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState(false);
  const [recoveredDraftSavedAt, setRecoveredDraftSavedAt] = useState(null);

  const draftKeyRef = useRef(null);
  const realtimeTimerRef = useRef(null);
  const productosRef = useRef([]);

  const salesDraftKey =
    branch?.id && user?.id ? `sales_draft_${branch.id}_${user.id}` : null;

  const salesDraftSessionKey = salesDraftKey
    ? `${salesDraftKey}_session_ack`
    : null;

  const subtotal = productos.reduce(
    (sum, producto) =>
      sum +
      Number(producto.precioOriginal ?? producto.precio ?? 0) *
        Number(producto.cantidad || 0),
    0
  );

  const discountTotal = productos.reduce(
    (sum, producto) => sum + Number(producto.descuentoMonto || 0),
    0
  );

  const total = subtotal - discountTotal;

  useEffect(() => {
    if (!salesDraftKey) {
      setDraftReady(false);
      setRecoveredDraft(false);
      setRecoveredDraftSavedAt(null);
      return;
    }

    if (draftKeyRef.current === salesDraftKey) return;

    draftKeyRef.current = salesDraftKey;
    setDraftReady(false);
    setRecoveredDraft(false);
    setRecoveredDraftSavedAt(null);

    try {
      const rawDraft = localStorage.getItem(salesDraftKey);

      if (!rawDraft) {
        setDraftReady(true);
        return;
      }

      const draft = JSON.parse(rawDraft);

      if (!draft || draft.version !== 1) {
        setDraftReady(true);
        return;
      }

      const restoredProducts = Array.isArray(draft.productos)
        ? draft.productos
        : [];

      setProductos(restoredProducts);
      setSelectedProduct(null);
      setCurrentSaleClient(draft.currentSaleClient || null);
      setTicketNumber(Number(draft.ticketNumber || 1));
      setSaleToken(draft.saleToken || null);
      setSaleNotes(draft.saleNotes || "");
      setBarcode(draft.barcode || "");
      setPendingTickets(
        Array.isArray(draft.pendingTickets) ? draft.pendingTickets : []
      );

      const hasRecoverableSale =
        restoredProducts.length > 0 ||
        !!draft.currentSaleClient ||
        !!draft.saleToken ||
        String(draft.saleNotes || "").trim().length > 0 ||
        String(draft.barcode || "").trim().length > 0;

      const alreadyAcknowledged =
        salesDraftSessionKey &&
        sessionStorage.getItem(salesDraftSessionKey) === "true";

      if (hasRecoverableSale && !alreadyAcknowledged) {
        setRecoveredDraft(true);
        setRecoveredDraftSavedAt(draft.savedAt || null);

        if (salesDraftSessionKey) {
          sessionStorage.setItem(salesDraftSessionKey, "true");
        }
      }

      setDraftReady(true);
    } catch (error) {
      console.error("Error restaurando venta en curso:", error);
      localStorage.removeItem(salesDraftKey);
      setRecoveredDraft(false);
      setRecoveredDraftSavedAt(null);
      setDraftReady(true);
    }
  }, [salesDraftKey, salesDraftSessionKey]);

  useEffect(() => {
    if (!draftReady || !salesDraftKey || draftKeyRef.current !== salesDraftKey) return;

    const hasDraftData =
      productos.length > 0 ||
      pendingTickets.length > 0 ||
      !!currentSaleClient ||
      !!saleToken ||
      saleNotes.trim().length > 0 ||
      barcode.trim().length > 0;

    if (!hasDraftData) {
      localStorage.removeItem(salesDraftKey);
      return;
    }

    const draft = {
      version: 1,
      savedAt: new Date().toISOString(),
      branchId: branch?.id || null,
      userId: user?.id || null,
      productos,
      currentSaleClient,
      ticketNumber,
      saleToken,
      saleNotes,
      barcode,
      pendingTickets,
      subtotal,
      discountTotal,
      total,
    };

    try {
      localStorage.setItem(salesDraftKey, JSON.stringify(draft));
    } catch (error) {
      console.error("Error guardando venta en curso:", error);
    }
  }, [
    draftReady,
    salesDraftKey,
    productos,
    pendingTickets,
    currentSaleClient,
    saleToken,
    saleNotes,
    barcode,
    ticketNumber,
    subtotal,
    discountTotal,
    total,
    branch?.id,
    user?.id,
  ]);

  useEffect(() => {
    productosRef.current = productos;

    if (productos.length === 0) {
      setStockWarningMsg("");
    }
  }, [productos]);

  const clearSalesDraft = () => {
    if (salesDraftKey) {
      localStorage.removeItem(salesDraftKey);
    }

    if (salesDraftSessionKey) {
      sessionStorage.removeItem(salesDraftSessionKey);
    }
  };

  const dismissRecoveredDraft = () => {
    setRecoveredDraft(false);
  };

  const discardRecoveredDraft = () => {
    clearSalesDraft();
    setProductos([]);
    setSelectedProduct(null);
    setCurrentSaleClient(null);
    setBarcode("");
    setSaleToken(null);
    setSaleNotes("");
    setStockWarningMsg("");
    setRecoveredDraft(false);
    setRecoveredDraftSavedAt(null);
  };

  const resetCurrentSale = () => {
    setProductos([]);
    setSelectedProduct(null);
    setCurrentSaleClient(null);
    setTicketNumber((prev) => prev + 1);
    setBarcode("");
    setSaleToken(null);
    setSaleNotes("");
    setStockWarningMsg("");
    setRecoveredDraft(false);
    setRecoveredDraftSavedAt(null);
  };

  const isValidUuid = (value) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value || "")
    );
  };

  const getBranchInventoryRow = async (productId) => {
    if (!branch?.id) {
      throw new Error("No se detectó la sucursal.");
    }

    const { data, error } = await supabase
      .from("branch_inventory")
      .select("stock, is_active, has_been_stocked, cost_price, sale_price")
      .eq("branch_id", branch.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (error) throw error;

    return data;
  };

  const getProductWithDiscount = async (product) => {
    if (!product?.id) return product;

    const { data: discountRow, error: discountError } = await supabase
      .from("product_discounts")
      .select("enabled, discount_percent, discount_concept")
      .eq("product_id", product.id)
      .maybeSingle();

    if (discountError) throw discountError;

    const hasDiscount =
      !!discountRow?.enabled && Number(discountRow?.discount_percent || 0) > 0;

    return {
      ...product,
      discount_enabled: hasDiscount,
      discount_percent: hasDiscount
        ? Number(discountRow.discount_percent || 0)
        : 0,
      discount_concept: hasDiscount ? discountRow?.discount_concept || "" : "",
    };
  };

  const getOpenCashSession = async () => {
    if (!branch?.id || !user?.id) {
      throw new Error("No se detectó la sucursal o el usuario.");
    }

    const { data, error } = await supabase
      .from("cash_register_sessions")
      .select("id, branch_id, user_id, status, opened_at, opening_amount")
      .eq("branch_id", branch.id)
      .eq("user_id", user.id)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error("No hay una sesión de caja abierta para este usuario.");
    }

    return data;
  };

  const validateShiftNotCut = async () => {
    try {
      const session = await getOpenCashSession();

      const { data, error } = await supabase
        .from("cash_cuts")
        .select("id")
        .eq("cash_register_session_id", session.id)
        .eq("cut_type", "shift")
        .limit(1);

      if (error) throw error;

      const alreadyCut = (data || []).length > 0;

      setShiftAlreadyCut(alreadyCut);

      if (alreadyCut) {
        localStorage.setItem("shift_cut_done", "true");
      } else {
        localStorage.removeItem("shift_cut_done");
      }

      return !alreadyCut;
    } catch (error) {
      console.error("Error validando corte:", error);
      return false;
    }
  };

  const syncShiftCutStatus = useCallback(async () => {
    const localFlag = localStorage.getItem("shift_cut_done");

    if (localFlag === "true") {
      setShiftAlreadyCut(true);
    }

    if (branch?.id && user?.id) {
      await validateShiftNotCut();
    }
  }, [branch?.id, user?.id]);

  const refreshCartInventoryFromRealtime = useCallback(async () => {
    if (!branch?.id) return;

    const currentProducts = productosRef.current || [];
    const trackedProducts = currentProducts.filter(
      (product) => product?.tracks_inventory
    );

    if (trackedProducts.length === 0) {
      setStockWarningMsg("");
      return;
    }

    const productIds = [
      ...new Set(trackedProducts.map((product) => product.id).filter(Boolean)),
    ];

    if (productIds.length === 0) {
      setStockWarningMsg("");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("branch_inventory")
        .select(
          "product_id, stock, is_active, has_been_stocked, cost_price, sale_price"
        )
        .eq("branch_id", branch.id)
        .in("product_id", productIds);

      if (error) throw error;

      const inventoryByProduct = {};

      (data || []).forEach((row) => {
        inventoryByProduct[row.product_id] = row;
      });

      let warning = "";

      const updateProductInventory = (product) => {
        if (!product?.tracks_inventory) return product;

        const inventoryRow = inventoryByProduct[product.id];

        if (!inventoryRow || inventoryRow.is_active === false) {
          if (!warning) {
            warning = `El producto "${
              product.nombre || product.codigo
            }" ya no está activo en esta sucursal.`;
          }

          return {
            ...product,
            stockReal: 0,
            existencia: 0,
          };
        }

        const stock = Number(inventoryRow.stock || 0);
        const quantity = Number(product.cantidad || 0);
        const availableAfterCart = Math.max(stock - quantity, 0);

        if (quantity > stock && !warning) {
          warning = `Stock actualizado: "${
            product.nombre || product.codigo
          }" ahora tiene ${stock} disponible y tienes ${quantity} en venta.`;
        }

        return {
          ...product,
          stockReal: stock,
          existencia: availableAfterCart,
          costo: Number(inventoryRow.cost_price ?? product.costo ?? 0),
        };
      };

      setProductos((prev) => {
        const updated = prev.map(updateProductInventory);
        productosRef.current = updated;
        return updated;
      });

      setSelectedProduct((prev) =>
        prev ? updateProductInventory(prev) : prev
      );

      setStockWarningMsg(warning);
    } catch (error) {
      console.error("Error actualizando inventario del carrito:", error);
    }
  }, [branch?.id]);

  useEffect(() => {
    syncShiftCutStatus();

    const handleFocus = () => {
      syncShiftCutStatus();
      refreshCartInventoryFromRealtime();
    };

    const handleStorage = (event) => {
      if (event.key === "shift_cut_done") {
        syncShiftCutStatus();
      }
    };

    const handleCutStatusChanged = () => {
      syncShiftCutStatus();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("shift-cut-status-changed", handleCutStatusChanged);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("shift-cut-status-changed", handleCutStatusChanged);
    };
  }, [syncShiftCutStatus, refreshCartInventoryFromRealtime]);

  useEffect(() => {
    if (!draftReady || !branch?.id || !user?.id) return;

    const refreshSafely = async () => {
      try {
        await syncShiftCutStatus();
        await refreshCartInventoryFromRealtime();
      } catch (error) {
        console.error("Error actualizando ventas en tiempo real:", error);
      }
    };

    const scheduleRealtimeRefresh = () => {
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
      }

      realtimeTimerRef.current = setTimeout(refreshSafely, 500);
    };

    refreshSafely();

    const intervalId = setInterval(() => {
      const hasTrackedProducts = (productosRef.current || []).some(
        (product) => product?.tracks_inventory
      );

      if (hasTrackedProducts) {
        refreshCartInventoryFromRealtime();
      }
    }, 2500);

    const channel = supabase
      .channel(`sales-realtime-${branch.id}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "branch_inventory",
          filter: `branch_id=eq.${branch.id}`,
        },
        scheduleRealtimeRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cash_cuts",
          filter: `branch_id=eq.${branch.id}`,
        },
        scheduleRealtimeRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cash_register_sessions",
          filter: `branch_id=eq.${branch.id}`,
        },
        scheduleRealtimeRefresh
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);

      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [
    branch?.id,
    user?.id,
    draftReady,
    refreshCartInventoryFromRealtime,
    syncShiftCutStatus,
  ]);

  const openPaymentFlow = async () => {
    if (productos.length === 0) {
      alert("No hay productos en la venta.");
      return;
    }

    if (processingSale) return;

    const canSell = await validateShiftNotCut();

    if (!canSell) {
      alert(
        "Ya realizaste el corte de cajero.\nDebes cerrar turno antes de seguir vendiendo."
      );
      return;
    }

    setSaleToken((prev) => prev || uuidv4());
    setShowPaymentModal(true);
  };

  const getAvailableCash = async (sessionId) => {
    try {
      const { data: session, error: sessionError } = await supabase
        .from("cash_register_sessions")
        .select("id, branch_id, opening_amount, opened_at")
        .eq("id", sessionId)
        .single();

      if (sessionError) throw sessionError;

      const openingAmount = Number(session?.opening_amount || 0);
      const openedAt = session?.opened_at;
      const branchId = session?.branch_id;

      const { data: movements, error: movementsError } = await supabase
        .from("cash_movements")
        .select("movement_type, amount")
        .eq("session_id", sessionId);

      if (movementsError) throw movementsError;

      let entradas = 0;
      let salidas = 0;

      for (const movement of movements || []) {
        if (movement.movement_type === "entrada") {
          entradas += Number(movement.amount || 0);
        } else if (movement.movement_type === "salida") {
          salidas += Number(movement.amount || 0);
        }
      }

      const { data: cashMethods, error: cashMethodsError } = await supabase
        .from("payment_methods")
        .select("id, name")
        .eq("name", "Efectivo");

      if (cashMethodsError) throw cashMethodsError;

      const cashMethodIds = (cashMethods || []).map((pm) => pm.id);

      let ventasEfectivo = 0;

      if (cashMethodIds.length > 0 && openedAt && branchId) {
        const { data: cashPayments, error: cashPaymentsError } = await supabase
          .from("sale_payments")
          .select(
            "amount, currency, exchange_rate, payment_method_id, created_at, branch_id"
          )
          .eq("branch_id", branchId)
          .gte("created_at", openedAt)
          .in("payment_method_id", cashMethodIds);

        if (cashPaymentsError) throw cashPaymentsError;

        ventasEfectivo = (cashPayments || []).reduce((sum, payment) => {
          const amount = Number(payment.amount || 0);
          const currency = String(payment.currency || "MXN").toUpperCase();
          const exchangeRate = Number(payment.exchange_rate || 0);

          if (currency === "MXN") {
            return sum + amount;
          }

          if (currency === "USD" && exchangeRate > 0) {
            return sum + amount * exchangeRate;
          }

          return sum;
        }, 0);
      }

      return openingAmount + entradas + ventasEfectivo - salidas;
    } catch (error) {
      console.error("Error calculando efectivo disponible:", error);
      return 0;
    }
  };

  const buildPaymentsPayload = (paymentData) => {
    if (!paymentData?.method) {
      throw new Error("No se detectó el método de pago.");
    }

    if (paymentData.method === "Mixto") {
      const rows = [
        {
          payment_method_name: "Efectivo",
          amount: Number(paymentData?.details?.efectivo || 0),
          currency: "MXN",
          exchange_rate: null,
        },
        {
          payment_method_name: "Terminal",
          amount: Number(paymentData?.details?.tarjeta || 0),
          currency: "MXN",
          exchange_rate: null,
        },
        {
          payment_method_name: "Dólares",
          amount: Number(paymentData?.details?.dolares || 0),
          currency: "USD",
          exchange_rate: Number(paymentData?.details?.exchangeRate || 0) || null,
        },
      ].filter((row) => row.amount > 0);

      if (rows.length === 0) {
        throw new Error("El pago mixto no contiene montos válidos.");
      }

      return rows;
    }

    const paymentMethodNameMap = {
      Efectivo: "Efectivo",
      Dolares: "Dólares",
      Terminal: "Terminal",
      Transferencia: "Transferencia",
    };

    const paymentMethodName = paymentMethodNameMap[paymentData.method];

    if (!paymentMethodName) {
      throw new Error("Método de pago no válido.");
    }

    return [
      {
        payment_method_name: paymentMethodName,
        amount:
          paymentData.method === "Dolares"
            ? Number(paymentData?.details?.dollarAmount || 0)
            : Number(paymentData.total || 0),
        currency: paymentData.method === "Dolares" ? "USD" : "MXN",
        exchange_rate:
          paymentData.method === "Dolares"
            ? Number(paymentData?.details?.exchangeRate || 0) || null
            : null,
        reference:
          paymentData.method === "Transferencia"
            ? paymentData?.details?.trackingCode?.trim() || null
            : null,
      },
    ];
  };

  const buildProductsPayload = () => {
    return productos.map((p) => ({
      product_id: p.id,
      quantity: Number(p.cantidad),
      unit_price: Number(p.precio),
      total_price: Number(p.importe),
      original_unit_price: Number(p.precioOriginal ?? p.precio),
      final_unit_price: Number(p.precio),
      discount_type:
        Number(p.descuentoMonto || 0) > 0 ? p.descuentoTipo || "amount" : null,
      discount_value: Number(p.descuentoValor || 0),
      discount_amount: Number(p.descuentoMonto || 0),
    }));
  };

  const printSaleTicket = async ({
    saleId,
    paymentData,
    paymentPayload,
    notes,
    saleDate,
  }) => {
    try {
      const [detailsRes, kitItemsRes] = await Promise.all([
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
          .eq("sale_id", saleId),

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
          .eq("sale_id", saleId),
      ]);

      if (detailsRes.error) throw detailsRes.error;
      if (kitItemsRes.error) throw kitItemsRes.error;

      const detailsRows = detailsRes.data || [];
      const kitItemRows = kitItemsRes.data || [];

      const productIds = [
        ...new Set(
          [
            ...detailsRows.map((d) => d.product_id),
            ...kitItemRows.map((k) => k.component_product_id),
          ].filter(Boolean)
        ),
      ];

      const { data: productsRows, error: productsError } = productIds.length
        ? await supabase
            .from("products")
            .select("id, name, barcode, is_kit")
            .in("id", productIds)
        : { data: [], error: null };

      if (productsError) throw productsError;

      const productMap = {};
      const productIsKitMap = {};

      for (const product of productsRows || []) {
        productMap[product.id] = product.name || product.barcode || "PRODUCTO";
        productIsKitMap[product.id] = !!product.is_kit;
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

      const itemsForPrint = detailsRows.map((item) => {
        const components = kitItemsByDetail[item.id] || [];

        return {
          quantity: Number(item.quantity || 0),
          description: productMap[item.product_id] || "PRODUCTO",
          unit_price: Number(item.final_unit_price || item.unit_price || 0),
          original_unit_price: Number(
            item.original_unit_price || item.unit_price || 0
          ),
          discount_amount: Number(item.discount_amount || 0),
          line_total: Number(item.total_price || 0),
          is_kit: productIsKitMap[item.product_id] || components.length > 0,
          components: components.map((component) => ({
            quantity: component.quantity,
            description: component.description,
          })),
        };
      });

      const totalPaid = (paymentPayload || []).reduce((acc, payment) => {
        const amount = Number(payment.amount || 0);
        const currency = String(payment.currency || "MXN").toUpperCase();
        const exchangeRate = Number(payment.exchange_rate || 0);

        if (currency === "USD") {
          return acc + (exchangeRate > 0 ? amount * exchangeRate : 0);
        }

        return acc + amount;
      }, 0);

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
          folio: String(saleId).slice(0, 8).toUpperCase(),
          created_at: saleDate,
          subtotal: Number(subtotal),
          tax: 0,
          discount_total: Number(discountTotal || 0),
          total: Number(total),
          amount_received: totalPaid || Number(total),
          change_amount: Math.max(Number(paymentData?.change || 0), 0),
          payment_method: paymentData?.method || "",
          payments: paymentPayload || [],
          status: "completed",
          notes: notes || paymentData?.notes || "",
          cashier_name: (user?.username || user?.email || "CAJERO").toUpperCase(),
        },
        items: itemsForPrint,
        cashierName: (user?.username || user?.email || "CAJERO").toUpperCase(),
        footer: {
          line1: "Gracias por su compra",
          line2: "Agenda tu cita de baño",
          phone: "998 117 5387",
          returnPolicy: "Para cambios o devoluciones presentar ticket de compra",
        },
        isReprint: false,
      });

      const printResult = await printTicket(ticketText);

      if (!printResult?.success) {
        console.error("No se pudo imprimir el ticket automáticamente.");
      }
    } catch (error) {
      console.error("Error al generar/imprimir ticket automático:", error);
    }
  };

  const increaseSelectedProductQuantity = () => {
    if (!selectedProduct) return;

    let inventoryExceeded = false;

    setProductos((prev) =>
      prev.map((p) => {
        if (p.id !== selectedProduct.id) return p;

        if (p.tracks_inventory && p.cantidad >= p.stockReal) {
          inventoryExceeded = true;
          return p;
        }

        const nuevaCantidad = p.cantidad + 1;
        const precioOriginal = Number(p.precioOriginal ?? p.precio ?? 0);
        const precioFinal = Number(p.precio ?? 0);
        const descuentoUnitario = Math.max(precioOriginal - precioFinal, 0);

        return {
          ...p,
          cantidad: nuevaCantidad,
          importe: nuevaCantidad * precioFinal,
          descuentoMonto: descuentoUnitario * nuevaCantidad,
          existencia: p.tracks_inventory ? p.stockReal - nuevaCantidad : "∞",
        };
      })
    );

    if (inventoryExceeded) {
      alert("No hay suficiente inventario.");
      return;
    }

    setSelectedProduct((prev) => {
      if (!prev) return prev;
      if (prev.tracks_inventory && prev.cantidad >= prev.stockReal) return prev;

      const nuevaCantidad = prev.cantidad + 1;
      const precioOriginal = Number(prev.precioOriginal ?? prev.precio ?? 0);
      const precioFinal = Number(prev.precio ?? 0);
      const descuentoUnitario = Math.max(precioOriginal - precioFinal, 0);

      return {
        ...prev,
        cantidad: nuevaCantidad,
        importe: nuevaCantidad * precioFinal,
        descuentoMonto: descuentoUnitario * nuevaCantidad,
        existencia: prev.tracks_inventory ? prev.stockReal - nuevaCantidad : "∞",
      };
    });
  };

  const decreaseSelectedProductQuantity = () => {
    if (!selectedProduct) return;

    const productoActual = productos.find((p) => p.id === selectedProduct.id);
    if (!productoActual) return;

    if (productoActual.cantidad === 1) {
      const updatedProductos = productos.filter((p) => p.id !== selectedProduct.id);
      setProductos(updatedProductos);
      setSelectedProduct(null);
      return;
    }

    setProductos((prev) =>
      prev.map((p) => {
        if (p.id !== selectedProduct.id) return p;

        const nuevaCantidad = p.cantidad - 1;
        const precioOriginal = Number(p.precioOriginal ?? p.precio ?? 0);
        const precioFinal = Number(p.precio ?? 0);
        const descuentoUnitario = Math.max(precioOriginal - precioFinal, 0);

        return {
          ...p,
          cantidad: nuevaCantidad,
          importe: nuevaCantidad * precioFinal,
          descuentoMonto: descuentoUnitario * nuevaCantidad,
          existencia: p.tracks_inventory ? p.stockReal - nuevaCantidad : "∞",
        };
      })
    );

    setSelectedProduct((prev) => {
      if (!prev) return prev;

      const nuevaCantidad = prev.cantidad - 1;
      const precioOriginal = Number(prev.precioOriginal ?? prev.precio ?? 0);
      const precioFinal = Number(prev.precio ?? 0);
      const descuentoUnitario = Math.max(precioOriginal - precioFinal, 0);

      return {
        ...prev,
        cantidad: nuevaCantidad,
        importe: nuevaCantidad * precioFinal,
        descuentoMonto: descuentoUnitario * nuevaCantidad,
        existencia: prev.tracks_inventory ? prev.stockReal - nuevaCantidad : "∞",
      };
    });
  };

  const calculateDiscountedProduct = (basePrice, product) => {
    const originalPrice = Number(basePrice || 0);
    const discountEnabled =
      !!product.discount_enabled && Number(product.discount_percent || 0) > 0;

    if (!discountEnabled) {
      return {
        precioOriginal: originalPrice,
        precioFinal: originalPrice,
        descuentoTipo: null,
        descuentoValor: 0,
        descuentoMontoUnitario: 0,
        discountPercent: 0,
        discountConcept: "",
      };
    }

    const discountPercent = Number(product.discount_percent || 0);
    const descuentoMontoUnitario = originalPrice * (discountPercent / 100);
    const precioFinal = Math.max(originalPrice - descuentoMontoUnitario, 0);

    return {
      precioOriginal: originalPrice,
      precioFinal,
      descuentoTipo: "percent",
      descuentoValor: discountPercent,
      descuentoMontoUnitario,
      discountPercent,
      discountConcept: product.discount_concept || "",
    };
  };

  const addProductToCart = async (product) => {
    if (!product?.id) return;

    const tracksInventory = !!product.tracks_inventory;

    if (tracksInventory) {
      const inventoryRow = await getBranchInventoryRow(product.id);

      if (!inventoryRow || inventoryRow.is_active === false) {
        alert("Este producto no está activo en el inventario de esta sucursal.");
        return;
      }

      const stock = Number(inventoryRow.stock || 0);
      const hasBeenStocked = !!inventoryRow.has_been_stocked;

      if (!hasBeenStocked && stock <= 0) {
        alert("Este producto aún no tiene inventario inicial registrado.");
        return;
      }

      if (stock <= 0) {
        alert("No hay existencia disponible.");
        return;
      }

      const existingProduct = productos.find((p) => p.id === product.id);

      if (existingProduct) {
        if (existingProduct.cantidad + 1 > stock) {
          alert("No hay suficiente inventario.");
          return;
        }

        const updatedProducts = productos.map((p) => {
          if (p.id !== product.id) return p;

          const nuevaCantidad = p.cantidad + 1;
          const precioOriginal = Number(p.precioOriginal ?? p.precio ?? 0);
          const precioFinal = Number(p.precio ?? 0);
          const descuentoUnitario = Math.max(precioOriginal - precioFinal, 0);

          return {
            ...p,
            cantidad: nuevaCantidad,
            importe: nuevaCantidad * precioFinal,
            descuentoMonto: descuentoUnitario * nuevaCantidad,
            stockReal: stock,
            existencia: Math.max(stock - nuevaCantidad, 0),
          };
        });

        setProductos(updatedProducts);

        if (selectedProduct?.id === product.id) {
          const updatedSelected = updatedProducts.find((p) => p.id === product.id);
          setSelectedProduct(updatedSelected || null);
        }

        return;
      }

      const salePrice = Number(inventoryRow.sale_price ?? product.sale_price ?? 0);
      const costPrice = Number(inventoryRow.cost_price ?? product.cost_price ?? 0);
      const discountData = calculateDiscountedProduct(salePrice, product);

      const newProduct = {
        id: product.id,
        codigo: product.barcode,
        nombre: product.name,
        precioOriginal: discountData.precioOriginal,
        precio: discountData.precioFinal,
        costo: costPrice,
        cantidad: 1,
        importe: discountData.precioFinal,
        descuentoTipo: discountData.descuentoTipo,
        descuentoValor: discountData.descuentoValor,
        descuentoMonto: discountData.descuentoMontoUnitario,
        discountPercent: discountData.discountPercent,
        discountConcept: discountData.discountConcept,
        stockReal: stock,
        existencia: stock - 1,
        is_kit: !!product.is_kit,
        tracks_inventory: true,
      };

      setProductos((prev) => [...prev, newProduct]);
      return;
    }

    const existingProduct = productos.find((p) => p.id === product.id);

    if (existingProduct) {
      const updatedProducts = productos.map((p) => {
        if (p.id !== product.id) return p;

        const nuevaCantidad = p.cantidad + 1;
        const precioOriginal = Number(p.precioOriginal ?? p.precio ?? 0);
        const precioFinal = Number(p.precio ?? 0);
        const descuentoUnitario = Math.max(precioOriginal - precioFinal, 0);

        return {
          ...p,
          cantidad: nuevaCantidad,
          importe: nuevaCantidad * precioFinal,
          descuentoMonto: descuentoUnitario * nuevaCantidad,
          existencia: "∞",
        };
      });

      setProductos(updatedProducts);

      if (selectedProduct?.id === product.id) {
        const updatedSelected = updatedProducts.find((p) => p.id === product.id);
        setSelectedProduct(updatedSelected || null);
      }

      return;
    }

    const salePrice = Number(product.sale_price ?? 0);
    const costPrice = Number(product.cost_price ?? 0);
    const discountData = calculateDiscountedProduct(salePrice, product);

    const newProduct = {
      id: product.id,
      codigo: product.barcode,
      nombre: product.name,
      precioOriginal: discountData.precioOriginal,
      precio: discountData.precioFinal,
      costo: costPrice,
      cantidad: 1,
      importe: discountData.precioFinal,
      descuentoTipo: discountData.descuentoTipo,
      descuentoValor: discountData.descuentoValor,
      descuentoMonto: discountData.descuentoMontoUnitario,
      discountPercent: discountData.discountPercent,
      discountConcept: discountData.discountConcept,
      stockReal: null,
      existencia: "∞",
      is_kit: !!product.is_kit,
      tracks_inventory: false,
    };

    setProductos((prev) => [...prev, newProduct]);
  };

  const handleBarcodeSearch = async () => {
    if (shiftAlreadyCut) {
      alert(
        "Ya realizaste el corte de cajero.\nDebes cerrar turno antes de seguir vendiendo."
      );
      return;
    }

    if (!branch?.id) {
      alert("La sucursal aún no está cargada.");
      return;
    }

    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;

    try {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select(
          "id, barcode, name, cost_price, sale_price, is_kit, status, is_global, tracks_inventory"
        )
        .eq("barcode", cleanBarcode)
        .eq("status", true)
        .maybeSingle();

      if (productError) throw productError;

      if (!product) {
        alert("Producto no encontrado.");
        setBarcode("");
        return;
      }

      if (!product.tracks_inventory) {
        if (!product.is_global) {
          alert("Este producto no está disponible para esta sucursal.");
          setBarcode("");
          return;
        }

        const productWithDiscount = await getProductWithDiscount(product);
        await addProductToCart(productWithDiscount);
        setBarcode("");
        return;
      }

      const { data: inventoryRow, error: inventoryError } = await supabase
        .from("branch_inventory")
        .select("stock, is_active, has_been_stocked, cost_price, sale_price")
        .eq("branch_id", branch.id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (inventoryError) throw inventoryError;

      if (!inventoryRow) {
        alert("Este producto no existe en el inventario de esta sucursal.");
        setBarcode("");
        return;
      }

      if (inventoryRow.is_active === false) {
        alert("Este producto está inactivo en esta sucursal.");
        setBarcode("");
        return;
      }

      const currentStock = Number(inventoryRow.stock || 0);
      const hasBeenStocked = !!inventoryRow.has_been_stocked;

      if (!hasBeenStocked && currentStock <= 0) {
        alert("Este producto aún no tiene inventario inicial registrado en esta sucursal.");
        setBarcode("");
        return;
      }

      if (currentStock <= 0) {
        alert("No hay existencia disponible en esta sucursal.");
        setBarcode("");
        return;
      }

      const productWithDiscount = await getProductWithDiscount(product);
      await addProductToCart(productWithDiscount);
      setBarcode("");
    } catch (err) {
      console.error("Error buscando producto:", err);
      alert(err.message || "Error buscando producto.");
    }
  };

  const handleAddProductFromVerifier = async (product) => {
    if (shiftAlreadyCut) {
      alert(
        "Ya realizaste el corte de cajero.\nDebes cerrar turno antes de seguir vendiendo."
      );
      return;
    }

    if (!product) return;

    try {
      await addProductToCart(product);
      console.log("Producto agregado desde verificador:", product);
    } catch (err) {
      console.error("Error agregando producto desde verificador:", err);
      alert("No se pudo agregar el producto.");
    }
  };

  const handleProductSelect = (producto) => {
    if (selectedProduct?.id === producto.id) {
      setSelectedProduct(null);
    } else {
      setSelectedProduct(producto);
    }
  };

  const handleDeleteSelectedProduct = () => {
    if (!selectedProduct) return;

    const updatedProductos = productos.filter((p) => p.id !== selectedProduct.id);
    setProductos(updatedProductos);
    setSelectedProduct(null);
  };

  const handleApplyDiscount = (discountData) => {
    if (!selectedProduct) return;

    const newPrice = Number.parseFloat(discountData.newPrice);

    if (Number.isNaN(newPrice) || newPrice < 0) {
      alert("Precio de descuento inválido.");
      return;
    }

    const updatedProductos = productos.map((producto) => {
      if (producto.id !== selectedProduct.id) return producto;

      const precioOriginal = Number(producto.precioOriginal ?? producto.precio ?? 0);
      const cantidad = Number(producto.cantidad || 0);
      const precioFinal = newPrice;
      const descuentoUnitario = Math.max(precioOriginal - precioFinal, 0);
      const descuentoTotalProducto = descuentoUnitario * cantidad;

      return {
        ...producto,
        precioOriginal,
        precio: precioFinal,
        importe: precioFinal * cantidad,
        descuentoTipo: descuentoTotalProducto > 0 ? "amount" : null,
        descuentoValor: descuentoUnitario,
        descuentoMonto: descuentoTotalProducto,
      };
    });

    setProductos(updatedProductos);

    const updatedSelected = updatedProductos.find(
      (producto) => producto.id === selectedProduct.id
    );
    setSelectedProduct(updatedSelected || null);
  };

  const validateCartStockBeforeSale = async () => {
    await refreshCartInventoryFromRealtime();

    for (const item of productosRef.current) {
      if (!item.tracks_inventory) continue;

      const inventoryRow = await getBranchInventoryRow(item.id);
      const currentStock = Number(inventoryRow?.stock || 0);
      const hasBeenStocked = !!inventoryRow?.has_been_stocked;

      if (!hasBeenStocked && currentStock <= 0) {
        alert(
          `El producto "${
            item.nombre || item.codigo
          }" aún no tiene inventario inicial registrado.`
        );
        return false;
      }

      if (currentStock <= 0) {
        alert(`El producto "${item.nombre || item.codigo}" ya no tiene existencia.`);
        return false;
      }

      if (item.cantidad > currentStock) {
        alert(
          `La cantidad de "${
            item.nombre || item.codigo
          }" excede el inventario disponible.`
        );
        return false;
      }
    }

    return true;
  };

  const handleMouseMove = useCallback((e) => {
    const { isResizing, columnIndex, startX, startWidth, nextStartWidth } =
      resizeRef.current;

    if (!isResizing || columnIndex === -1) return;

    const deltaX = e.clientX - startX;

    let newWidth = startWidth + deltaX;
    let newNextWidth = nextStartWidth - deltaX;

    if (newWidth < MIN_COLUMN_WIDTH) {
      newWidth = MIN_COLUMN_WIDTH;
      newNextWidth = startWidth + nextStartWidth - MIN_COLUMN_WIDTH;
    }

    if (newNextWidth < MIN_COLUMN_WIDTH) {
      newNextWidth = MIN_COLUMN_WIDTH;
      newWidth = startWidth + nextStartWidth - MIN_COLUMN_WIDTH;
    }

    setColumnWidths((prev) => {
      const newWidths = [...prev];
      newWidths[columnIndex] = newWidth;
      newWidths[columnIndex + 1] = newNextWidth;
      return newWidths;
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    resizeRef.current.isResizing = false;
    resizeRef.current.columnIndex = -1;

    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);

    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(
    (e, index) => {
      e.preventDefault();
      e.stopPropagation();

      if (index >= columnWidths.length - 1) return;

      resizeRef.current = {
        isResizing: true,
        columnIndex: index,
        startX: e.clientX,
        startWidth: columnWidths[index],
        nextStartWidth: columnWidths[index + 1],
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [columnWidths, handleMouseMove, handleMouseUp]
  );

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (tableRef.current && !isInitialized) {
      const tableWidth = tableRef.current.offsetWidth;
      const availableWidth = tableWidth - 22;
      const proportions = [0.4, 0.15, 0.1, 0.15];

      const calculatedWidths = proportions.map((prop) =>
        Math.max(MIN_COLUMN_WIDTH, Math.floor(availableWidth * prop))
      );

      const usedWidth = calculatedWidths.reduce((sum, width) => sum + width, 0);
      const lastColumnWidth = Math.max(MIN_COLUMN_WIDTH, availableWidth - usedWidth);

      setColumnWidths([...calculatedWidths, lastColumnWidth]);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const handleSaveEntry = async (newMovement) => {
    if (shiftAlreadyCut) {
      alert("El turno ya fue cortado. Debes cerrar turno antes de hacer movimientos.");
      return false;
    }

    try {
      if (!user?.id) {
        alert("No se detectó el usuario.");
        return false;
      }

      if (!branch?.id) {
        alert("No se detectó la sucursal.");
        return false;
      }

      const openSession = await getOpenCashSession();

      const { data, error } = await supabase
        .from("cash_movements")
        .insert([
          {
            session_id: openSession.id,
            user_id: user.id,
            movement_type: newMovement.type,
            amount: Number(newMovement.amount),
            description: newMovement.description?.trim() || null,
            branch_id: branch.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setCashMovements((prev) => [...prev, data]);
      alert("Entrada de efectivo registrada correctamente.");
      return true;
    } catch (error) {
      console.error("Error al guardar entrada de efectivo:", error);
      alert(error.message || "No se pudo guardar la entrada de efectivo.");
      return false;
    }
  };

  const handleSaveExit = async (newMovement) => {
    if (shiftAlreadyCut) {
      alert("El turno ya fue cortado. Debes cerrar turno antes de hacer movimientos.");
      return false;
    }

    try {
      if (!user?.id) {
        alert("No se detectó el usuario.");
        return false;
      }

      if (!branch?.id) {
        alert("No se detectó la sucursal.");
        return false;
      }

      const openSession = await getOpenCashSession();

      if (!openSession) {
        alert("No hay sesión de caja abierta.");
        return false;
      }

      const rawAvailableCash = await getAvailableCash(openSession.id);
      const availableCash = Math.max(rawAvailableCash, 0);
      const exitAmount = Number(newMovement.amount);

      if (exitAmount > availableCash) {
        alert(
          `No puedes retirar $${exitAmount.toFixed(
            2
          )}. Disponible en caja: $${availableCash.toFixed(2)}`
        );
        return false;
      }

      const payload = {
        session_id: openSession.id,
        user_id: user.id,
        movement_type: newMovement.type,
        amount: exitAmount,
        description: newMovement.description?.trim() || null,
        branch_id: branch.id,
      };

      const { data, error } = await supabase
        .from("cash_movements")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setCashMovements((prev) => [...prev, data]);
      alert("Salida de efectivo registrada correctamente.");
      return true;
    } catch (error) {
      console.error("Error al guardar salida de efectivo:", error);
      alert(error.message || "No se pudo guardar la salida de efectivo.");
      return false;
    }
  };

  const openClientModal = () => {
    setClientModalOpen(true);
  };

  const handleAssignClient = (client) => {
    setCurrentSaleClient(client);
  };

  const handleProcessPayment = async (paymentData) => {
    if (processingSale) return false;

    try {
      setProcessingSale(true);

      const canSell = await validateShiftNotCut();

      if (!canSell) {
        alert(
          "Ya realizaste el corte de cajero.\nDebes cerrar turno antes de seguir vendiendo."
        );
        setShowPaymentModal(false);
        return false;
      }

      if (!user?.id) {
        alert("No se detectó el usuario.");
        return false;
      }

      if (!branch?.id) {
        alert("No se detectó la sucursal.");
        return false;
      }

      if (productos.length === 0) {
        alert("No hay productos en la venta.");
        return false;
      }

      if (!saleToken) {
        alert("No se generó el token de venta.");
        return false;
      }

      const invalidProduct = productos.find((p) => !isValidUuid(p.id));
      if (invalidProduct) {
        alert("Hay productos sin UUID real. No se puede guardar la venta.");
        return false;
      }

      const stockIsValid = await validateCartStockBeforeSale();
      if (!stockIsValid) {
        return false;
      }

      const productsPayload = buildProductsPayload();
      const paymentsPayload = buildPaymentsPayload(paymentData);
      const saleDate = new Date().toISOString();

      const { data: saleId, error } = await supabase.rpc(
        "create_sale_transaction",
        {
          p_branch_id: branch.id,
          p_user_id: user.id,
          p_customer_id: currentSaleClient?.id || null,
          p_subtotal: Number(subtotal),
          p_tax: 0,
          p_total: Number(total),
          p_sale_date: saleDate,
          p_products: productsPayload,
          p_payments: paymentsPayload,
          p_client_sale_token: saleToken,
          p_notes: paymentData?.notes?.trim() || null,
        }
      );

      if (error) throw error;

      if (paymentData?.shouldPrint) {
        await printSaleTicket({
          saleId,
          paymentData,
          paymentPayload: paymentsPayload,
          notes: paymentData?.notes?.trim() || null,
          saleDate,
        });
      }

      clearSalesDraft();
      resetCurrentSale();
      setShowPaymentModal(false);

      alert("Venta registrada correctamente.");
      return true;
    } catch (error) {
      console.error("Error al registrar venta:", error);
      alert(error.message || "Error al registrar la venta.");
      return false;
    } finally {
      setProcessingSale(false);
    }
  };

  const handleSavePendingTicket = (ticketName) => {
    const pendingTicket = {
      number: ticketNumber,
      name: ticketName,
      products: productos,
      client: currentSaleClient,
      subtotal,
      discountTotal,
      total,
      date: new Date().toISOString(),
    };

    setPendingTickets((prev) => [...prev, pendingTicket]);

    setProductos([]);
    setCurrentSaleClient(null);
    setSelectedProduct(null);
    setTicketNumber((prev) => prev + 1);
    setBarcode("");
    setSaleToken(null);
    setRecoveredDraft(false);
    setRecoveredDraftSavedAt(null);
  };

  const handleChangeToTicket = (ticket) => {
    if (productos.length > 0) {
      const currentTicket = {
        number: ticketNumber,
        name: `Ticket ${ticketNumber}`,
        products: productos,
        client: currentSaleClient,
        subtotal,
        discountTotal,
        total,
        date: new Date().toISOString(),
      };

      const updatedPendingTickets = pendingTickets.filter((t) => t !== ticket);
      setPendingTickets([...updatedPendingTickets, currentTicket]);
    } else {
      const updatedPendingTickets = pendingTickets.filter((t) => t !== ticket);
      setPendingTickets(updatedPendingTickets);
    }

    setProductos(ticket.products);
    setCurrentSaleClient(ticket.client);
    setTicketNumber(ticket.number);
    setSelectedProduct(null);
    setBarcode("");
    setSaleToken(null);
  };

  const handleDeleteTicket = (index) => {
    const updatedPendingTickets = pendingTickets.filter((_, i) => i !== index);
    setPendingTickets(updatedPendingTickets);
  };

  const handleOpenChangeModal = () => {
    if (pendingTickets.length === 0) {
      alert("No hay tickets pendientes");
    } else {
      setChangeModalOpen(true);
    }
  };

  const handleOpenDeleteModal = () => {
    if (pendingTickets.length === 0) {
      alert("No hay tickets pendientes por eliminar");
    } else {
      setDeleteModalOpen(true);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isAnyModalOpen =
        showPaymentModal ||
        isEntryModalOpen ||
        isExitModalOpen ||
        isClientModalOpen ||
        isVerifierModalOpen ||
        isSearchModalOpen ||
        isDiscountModalOpen ||
        isPendingModalOpen ||
        isChangeModalOpen ||
        isDeleteModalOpen ||
        isDeleteItemModalOpen ||
        isSalesHistoryModalOpen;

      const target = e.target;
      const isInputElement =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !isAnyModalOpen) {
        e.preventDefault();

        if (productos.length === 0) return;

        if (!selectedProduct) {
          setSelectedProduct(productos[0]);
        } else {
          const currentIndex = productos.findIndex(
            (p) => p.id === selectedProduct.id
          );

          if (e.key === "ArrowDown") {
            const nextIndex = (currentIndex + 1) % productos.length;
            setSelectedProduct(productos[nextIndex]);
          } else if (e.key === "ArrowUp") {
            const prevIndex =
              currentIndex === 0 ? productos.length - 1 : currentIndex - 1;
            setSelectedProduct(productos[prevIndex]);
          }
        }

        return;
      }

      if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();

        if (selectedProduct) {
          setDiscountModalOpen(true);
        }

        return;
      }

      if (!isAnyModalOpen && selectedProduct && !isInputElement) {
        if (e.key === "+" || e.key === "=" || e.key === "Add") {
          e.preventDefault();
          increaseSelectedProductQuantity();
          return;
        }

        if (e.key === "-" || e.key === "Subtract") {
          e.preventDefault();
          decreaseSelectedProductQuantity();
          return;
        }
      }

      switch (e.key) {
        case "F12":
          e.preventDefault();
          openPaymentFlow();
          break;
        case "F5":
          e.preventDefault();
          handleOpenChangeModal();
          break;
        case "F6":
          e.preventDefault();
          setPendingModalOpen(true);
          break;
        case "F7":
          e.preventDefault();
          if (shiftAlreadyCut) {
            alert("El turno ya fue cortado. Debes cerrar turno antes de hacer movimientos.");
          } else {
            setEntryModalOpen(true);
          }
          break;
        case "F8":
          e.preventDefault();
          if (shiftAlreadyCut) {
            alert("El turno ya fue cortado. Debes cerrar turno antes de hacer movimientos.");
          } else {
            setExitModalOpen(true);
          }
          break;
        case "F9":
          e.preventDefault();
          setVerifierModalOpen(true);
          break;
        case "F10":
          e.preventDefault();
          setSearchModalOpen(true);
          break;
        case "Backspace":
          if (isInputElement) return;

          if (!isAnyModalOpen) {
            e.preventDefault();

            if (selectedProduct) {
              setDeleteItemModalOpen(true);
            } else {
              alert("Por favor, selecciona un producto primero");
            }
          }
          break;
        case "Delete":
          e.preventDefault();
          handleOpenDeleteModal();
          break;
        case "Escape":
          if (processingSale) return;

          if (showPaymentModal) setShowPaymentModal(false);
          else if (isEntryModalOpen) setEntryModalOpen(false);
          else if (isExitModalOpen) setExitModalOpen(false);
          else if (isClientModalOpen) setClientModalOpen(false);
          else if (isVerifierModalOpen) setVerifierModalOpen(false);
          else if (isSearchModalOpen) setSearchModalOpen(false);
          else if (isDiscountModalOpen) setDiscountModalOpen(false);
          else if (isPendingModalOpen) setPendingModalOpen(false);
          else if (isChangeModalOpen) setChangeModalOpen(false);
          else if (isDeleteModalOpen) setDeleteModalOpen(false);
          else if (isDeleteItemModalOpen) setDeleteItemModalOpen(false);
          else if (isSalesHistoryModalOpen) setSalesHistoryModalOpen(false);
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    showPaymentModal,
    isEntryModalOpen,
    isExitModalOpen,
    isClientModalOpen,
    isVerifierModalOpen,
    isSearchModalOpen,
    isDiscountModalOpen,
    isPendingModalOpen,
    isChangeModalOpen,
    isDeleteModalOpen,
    isDeleteItemModalOpen,
    isSalesHistoryModalOpen,
    selectedProduct,
    productos,
    pendingTickets,
    processingSale,
    shiftAlreadyCut,
  ]);

  const gridTemplate = columnWidths.map((width) => `${width}px`).join(" ");

  return (
    <div className={styles.ventasContainer}>
      <div className={styles.saleHeader}>
        <h2>VENTA - Ticket {ticketNumber}</h2>

        {currentSaleClient && (
          <div className={styles.clientInfo}>
            <span>Cliente: {currentSaleClient.name}</span>
          </div>
        )}
      </div>

      {shiftAlreadyCut && (
        <div className={styles.shiftCutWarning}>
          <span>
            Corte de cajero realizado. Debes cerrar turno antes de seguir vendiendo.
          </span>

          <span>PENDIENTE CERRAR TURNO</span>
        </div>
      )}

      {!shiftAlreadyCut && recoveredDraft && productos.length > 0 && (
        <div className={styles.recoveredDraftWarning}>
          <div className={styles.recoveredDraftText}>
            <strong>Se recuperó una venta pendiente.</strong>
            <span>
              {recoveredDraftSavedAt
                ? `Guardada automáticamente el ${new Date(
                    recoveredDraftSavedAt
                  ).toLocaleString("es-MX")}.`
                : "La venta fue guardada automáticamente antes de cerrar el POS."}
            </span>
          </div>

          <div className={styles.recoveredDraftActions}>
            <button
              type="button"
              className={styles.recoveredDraftContinue}
              onClick={dismissRecoveredDraft}
            >
              Continuar
            </button>

            <button
              type="button"
              className={styles.recoveredDraftDiscard}
              onClick={discardRecoveredDraft}
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {!shiftAlreadyCut && stockWarningMsg && (
        <div className={styles.shiftCutWarning}>
          <span>{stockWarningMsg}</span>
          <span>REVISAR STOCK</span>
        </div>
      )}

      <div className={styles.topActionBar}>
        <div
          className={styles.horizontalActionButton}
          onClick={() => setSearchModalOpen(true)}
        >
          <span className={styles.actionKey}>F10</span>
          <img src={searchIcon} alt="Buscar" className={styles.buttonIcon} />
          <span className={styles.actionText}>Buscar</span>
        </div>

        <div
          className={`${styles.horizontalActionButton} ${
            shiftAlreadyCut ? styles.actionButtonDisabled : ""
          }`}
          onClick={() => {
            if (shiftAlreadyCut) {
              alert("El turno ya fue cortado. Debes cerrar turno antes de hacer movimientos.");
              return;
            }
            setEntryModalOpen(true);
          }}
        >
          <span className={styles.actionKey}>F7</span>
          <img src={entryIcon} alt="Entradas" className={styles.buttonIcon} />
          <span className={styles.actionText}>Entradas</span>
        </div>

        <div
          className={`${styles.horizontalActionButton} ${
            shiftAlreadyCut ? styles.actionButtonDisabled : ""
          }`}
          onClick={() => {
            if (shiftAlreadyCut) {
              alert("El turno ya fue cortado. Debes cerrar turno antes de hacer movimientos.");
              return;
            }
            setExitModalOpen(true);
          }}
        >
          <span className={styles.actionKey}>F8</span>
          <img src={exitIcon} alt="Salidas" className={styles.buttonIcon} />
          <span className={styles.actionText}>Salidas</span>
        </div>

        <div
          className={styles.horizontalActionButton}
          onClick={() => {
            if (selectedProduct) {
              setDeleteItemModalOpen(true);
            } else {
              alert("Por favor, selecciona un producto primero");
            }
          }}
        >
          <span className={styles.actionKey}>DEL</span>
          <img src={deleteIcon} alt="Borrar" className={styles.buttonIcon} />
          <span className={styles.actionText}>Borrar Art.</span>
        </div>

        <div
          className={styles.horizontalActionButton}
          onClick={() => setVerifierModalOpen(true)}
        >
          <span className={styles.actionKey}>F9</span>
          <img src={verifyIcon} alt="Verificador" className={styles.buttonIcon} />
          <span className={styles.actionText}>Verificador</span>
        </div>
      </div>

      <div className={styles.productInputBar}>
        <div className={styles.inputSection}>
          <label>Código de Barras:</label>

          <input
            type="text"
            className={styles.barcodeInput}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleBarcodeSearch();
              }
            }}
            placeholder="Escanea o escribe código"
            disabled={shiftAlreadyCut}
          />
        </div>

        <div
          className={`${styles.addProductBtn} ${
            shiftAlreadyCut ? styles.actionButtonDisabled : ""
          }`}
          onClick={handleBarcodeSearch}
        >
          <span className={styles.actionKey2}>ENTER</span>
          <span className={styles.actionText2}>Agregar Producto</span>
        </div>
      </div>

      <div className={styles.productsTable} ref={tableRef}>
        <div
          className={styles.tableHeader}
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <span>
            Producto
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => handleMouseDown(e, 0)}
            />
          </span>

          <span>
            Precio Venta
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => handleMouseDown(e, 1)}
            />
          </span>

          <span>
            Cant.
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => handleMouseDown(e, 2)}
            />
          </span>

          <span>
            Importe
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => handleMouseDown(e, 3)}
            />
          </span>

          <span>Existencia</span>
        </div>

        <div className={styles.tableBody}>
          {productos.map((producto) => (
            <div
              key={producto.id}
              className={`${styles.tableRow} ${
                selectedProduct?.id === producto.id ? styles.selectedRow : ""
              }`}
              style={{ gridTemplateColumns: gridTemplate }}
              onClick={() => handleProductSelect(producto)}
            >
              <span className={styles.tableCell}>
                {producto.nombre || producto.codigo}
              </span>

              <span className={styles.tableCell}>
                ${Number(producto.precio || 0).toFixed(2)}
              </span>

              <span className={styles.tableCell}>{producto.cantidad}</span>

              <span className={styles.tableCell}>
                ${Number(producto.importe || 0).toFixed(2)}
              </span>

              <span className={styles.tableCell}>{producto.existencia}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footerBar}>
        <div className={styles.leftActions}>
          <div
            className={styles.squareButton}
            onClick={handleOpenChangeModal}
            data-tooltip="F5"
          >
            <img src={changeIcon} alt="Cambiar" className={styles.squareIcon} />
            <span className={styles.squareKey}>F5</span>
            <span className={styles.squareText}>Cambiar</span>
          </div>

          <div
            className={styles.squareButton}
            onClick={() => setPendingModalOpen(true)}
            data-tooltip="F6"
          >
            <span className={styles.squareKey}>F6</span>
            <span className={styles.squareText}>Pendiente</span>
          </div>

          <div className={styles.squareButton} onClick={handleOpenDeleteModal}>
            <img src={deleteIcon} alt="Eliminar" className={styles.squareIcon} />
            <span className={styles.squareText}>Eliminar</span>
          </div>

          <div
            className={styles.squareButton}
            onClick={() => {
              if (selectedProduct) {
                setDiscountModalOpen(true);
              } else {
                alert("Por favor, selecciona un producto primero");
              }
            }}
            data-tooltip="Ctrl + D"
          >
            <img
              src={DiscountIcon}
              alt="Descuento Icono"
              className={styles.squareIcon}
            />
            <span className={styles.squareText}>Descuento</span>
          </div>

          <div className={styles.squareButton} onClick={openClientModal}>
            <img
              src={assignClientIcon}
              alt="Asignar cliente"
              className={styles.squareIcon}
            />
            <span className={styles.squareText}>Asignar cliente</span>
          </div>

          <div
            className={styles.SquareButtonSecondary}
            onClick={() => setSalesHistoryModalOpen(true)}
          >
            <img
              src={SalesHistoryIcon}
              alt="Ventas del día y Devoluciones"
              className={styles.squareIconSecondary}
            />
            <span className={styles.squareText}>Ventas del día y Devoluciones</span>
          </div>
        </div>

        <div className={styles.rightActions}>
          <div className={styles.totalSection}>
            <span className={styles.totalLabel}>Subtotal:</span>
            <span className={styles.totalAmount}>${subtotal.toFixed(2)}</span>
          </div>

          <div className={styles.totalSection}>
            <span className={styles.totalLabel}>Descuento:</span>
            <span className={styles.totalAmount}>-${discountTotal.toFixed(2)}</span>
          </div>

          <div className={styles.totalSection}>
            <span className={styles.totalLabel}>Total:</span>
            <span className={styles.totalAmount}>${total.toFixed(2)}</span>
          </div>

          <div
            className={`${styles.payButton} ${
              shiftAlreadyCut ? styles.payButtonDisabled : ""
            }`}
            onClick={() => {
              if (!shiftAlreadyCut) {
                openPaymentFlow();
              }
            }}
          >
            <img src={payIcon} alt="Cobrar" className={styles.payIcon} />
            <span className={styles.payKey}>F12</span>
            <span className={styles.payText}>Cobrar</span>
          </div>
        </div>
      </div>

      <EntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        onSaveEntry={handleSaveEntry}
      />

      <ExitModal
        isOpen={isExitModalOpen}
        onClose={() => setExitModalOpen(false)}
        onSave={handleSaveExit}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          if (!processingSale) {
            setShowPaymentModal(false);
          }
        }}
        total={total}
        onProcessPayment={handleProcessPayment}
        processingSale={processingSale}
        saleNotes={saleNotes}
        setSaleNotes={setSaleNotes}
      />

      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onAssignClient={handleAssignClient}
        currentSaleClient={currentSaleClient}
      />

      <VerifierModal
        isOpen={isVerifierModalOpen}
        onClose={() => setVerifierModalOpen(false)}
        onAddToSale={handleAddProductFromVerifier}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onAddToSale={handleAddProductFromVerifier}
      />

      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setDiscountModalOpen(false)}
        onApplyDiscount={handleApplyDiscount}
        selectedProduct={selectedProduct}
      />

      <PendingTicketModal
        isOpen={isPendingModalOpen}
        onClose={() => setPendingModalOpen(false)}
        onAccept={handleSavePendingTicket}
        currentTicketNumber={ticketNumber}
        nextTicketNumber={ticketNumber + 1}
      />

      <ChangeTicketModal
        isOpen={isChangeModalOpen}
        onClose={() => setChangeModalOpen(false)}
        onSelectTicket={handleChangeToTicket}
        pendingTickets={pendingTickets}
      />

      <DeleteTicketModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onDeleteTicket={handleDeleteTicket}
        pendingTickets={pendingTickets}
      />

      <DeleteItemModal
        isOpen={isDeleteItemModalOpen}
        onClose={() => setDeleteItemModalOpen(false)}
        onConfirmDelete={handleDeleteSelectedProduct}
        selectedProduct={selectedProduct}
      />

      <SalesHistoryModal
        isOpen={isSalesHistoryModalOpen}
        onClose={() => setSalesHistoryModalOpen(false)}
      />
    </div>
  );
};

export default Sales; 