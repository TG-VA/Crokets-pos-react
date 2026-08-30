import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./InvoicesPending.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import { useBranch } from "../../../../contexts/BranchContext";
import InvoiceSaleModal from "../../Modals/InvoiceSaleModal/InvoiceSaleModal";

const TIME_ZONE = "America/Cancun";

const InvoicesPending = () => {
  const { branch } = useBranch();

  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

  const formatDateTime = (isoDate) => {
    if (!isoDate) return "—";

    return new Date(isoDate).toLocaleString("es-MX", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getDisplayFolio = (sale) => {
    if (!sale?.id) return "—";
    return sale.id.slice(0, 8).toUpperCase();
  };

  const dayRange = useMemo(() => {
    if (!dateFilter) return null;

    const start = new Date(`${dateFilter}T00:00:00-05:00`);
    const end = new Date(`${dateFilter}T23:59:59.999-05:00`);

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, [dateFilter]);

  const loadPendingSales = useCallback(async () => {
    if (!branch?.id) return;

    try {
      setLoadingSales(true);
      setError("");

      let query = supabase
        .from("sales")
        .select(`
          id,
          sale_date,
          subtotal,
          tax,
          total,
          status,
          user_id,
          customer_id,
          branch_id,
          users:user_id (
            username,
            email
          ),
          customers:customer_id (
            id,
            phone,
            email,
            fiscal_email,
            rfc,
            razon_social,
            cfdi_use,
            tax_regime,
            postal_code,
            is_billing_customer,
            status
          ),
          invoices (
            id
          )
        `)
        .eq("branch_id", branch.id)
        .eq("status", "completed")
        .order("sale_date", { ascending: false });

      if (dayRange) {
        query = query
          .gte("sale_date", dayRange.start)
          .lte("sale_date", dayRange.end);
      }

      const { data, error: salesError } = await query;

      if (salesError) throw salesError;

      const pendingSales = (data || []).filter(
        (sale) => !sale.invoices || sale.invoices.length === 0
      );

      setSales(pendingSales);
    } catch (err) {
      console.error("Error cargando ventas por facturar:", err);
      setError("No se pudieron cargar las ventas por facturar.");
      setSales([]);
    } finally {
      setLoadingSales(false);
    }
  }, [branch?.id, dayRange]);

  useEffect(() => {
    loadPendingSales();
  }, [loadPendingSales]);

  useEffect(() => {
    if (!branch?.id) return;

    const channel = supabase
      .channel(`invoices-pending-${branch.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
          filter: `branch_id=eq.${branch.id}`,
        },
        () => {
          loadPendingSales();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invoices",
          filter: `branch_id=eq.${branch.id}`,
        },
        () => {
          loadPendingSales();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Realtime activo: ventas por facturar");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branch?.id, loadPendingSales]);

  const filteredSales = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return sales;

    return sales.filter((sale) => {
      const folio = getDisplayFolio(sale).toLowerCase();
      const businessName = sale.customers?.razon_social?.toLowerCase() || "";
      const rfc = sale.customers?.rfc?.toLowerCase() || "";
      const cashier =
        sale.users?.username?.toLowerCase() ||
        sale.users?.email?.toLowerCase() ||
        "";

      return (
        folio.includes(search) ||
        businessName.includes(search) ||
        rfc.includes(search) ||
        cashier.includes(search)
      );
    });
  }, [sales, searchTerm]);

  const handleInvoiceSale = (sale) => {
    setSelectedSale(sale);
    setIsInvoiceModalOpen(true);
  };

  const handleCloseInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setSelectedSale(null);
  };

  const handleInvoiceSaved = async () => {
    await loadPendingSales();
  };

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>VENTAS POR FACTURAR</h1>
          <p>Ventas completadas de la sucursal actual que aún no tienen factura.</p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={loadPendingSales}
          disabled={loadingSales}
        >
          {loadingSales ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Fecha</label>
          <input
            type="date"
            value={dateFilter}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDateFilter(e.target.value)}
            className={styles.dateInput}
          />
        </div>

        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Buscar por folio, razón social, RFC o cajero..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />

          {searchTerm && (
            <button
              type="button"
              className={styles.clearSearchButton}
              onClick={() => setSearchTerm("")}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.resultsInfo}>
        {loadingSales
          ? "Cargando ventas..."
          : `Mostrando ${filteredSales.length} venta${
              filteredSales.length !== 1 ? "s" : ""
            } por facturar`}
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.salesTable}>
          <thead>
            <tr>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Cliente fiscal</th>
              <th>RFC</th>
              <th>Cajero</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {loadingSales ? (
              <tr>
                <td colSpan="8" className={styles.textCenter}>
                  Cargando ventas...
                </td>
              </tr>
            ) : filteredSales.length === 0 ? (
              <tr>
                <td colSpan="8" className={styles.textCenter}>
                  No hay ventas pendientes por facturar.
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => {
                const customer = sale.customers;
                const customerName =
                  customer?.razon_social || "PÚBLICO EN GENERAL";
                const cashier =
                  sale.users?.username || sale.users?.email || "SIN CAJERO";

                const isBillingReady =
                  !!customer?.rfc &&
                  !!customer?.razon_social &&
                  !!customer?.tax_regime &&
                  !!customer?.cfdi_use &&
                  !!customer?.postal_code &&
                  customer?.status !== false;

                return (
                  <tr key={sale.id}>
                    <td className={styles.folioCell}>
                      {getDisplayFolio(sale)}
                    </td>
                    <td>{formatDateTime(sale.sale_date)}</td>
                    <td>{customerName}</td>
                    <td>{customer?.rfc || "SIN RFC"}</td>
                    <td>{cashier.toUpperCase()}</td>
                    <td className={styles.totalCell}>
                      {formatCurrency(sale.total)}
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          isBillingReady
                            ? styles.statusReady
                            : styles.statusMissing
                        }`}
                      >
                        {isBillingReady ? "Listo" : "Faltan datos"}
                      </span>
                    </td>
                    <td>
<button
  type="button"
  className={styles.invoiceButton}
  onClick={() => handleInvoiceSale(sale)}
  title={
    isBillingReady ? "Facturar venta" : "Seleccionar o crear cliente fiscal"
  }
>
  Facturar
</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <InvoiceSaleModal
        isOpen={isInvoiceModalOpen}
        onClose={handleCloseInvoiceModal}
        sale={selectedSale}
        onSaved={handleInvoiceSaved}
      />
    </div>
  );
};

export default InvoicesPending;