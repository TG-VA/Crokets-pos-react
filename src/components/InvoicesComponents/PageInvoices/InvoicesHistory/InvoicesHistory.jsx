import React, { useEffect, useMemo, useState } from "react";
import styles from "./InvoicesHistory.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import { useBranch } from "../../../../contexts/BranchContext";

const InvoiceHistory = () => {
  const { branch } = useBranch();

  const [invoices, setInvoices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("current");

  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [startDate, setStartDate] = useState(getTodayString);
  const [endDate, setEndDate] = useState(getTodayString);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");

  const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

  const formatDateTime = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleString("es-MX", {
      timeZone: "America/Cancun",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getBranchLabel = (branchData) => {
    if (!branchData) return "Sucursal no disponible";

    const code = branchData.code || branchData.branch_code || "";
    const name = branchData.name || branchData.branch_name || "";

    if (code && name) return `${code} - ${name}`;
    if (name) return name;
    if (code) return code;

    return "Sucursal no disponible";
  };

  const isGlobalView = branchFilter === "all";

  const getDisplayFolio = (invoice) => {
    if (invoice?.serie && invoice?.folio) {
      return `${invoice.serie}-${String(invoice.folio).padStart(6, "0")}`;
    }

    if (invoice?.id) {
      return invoice.id.slice(0, 8).toUpperCase();
    }

    return "—";
  };

  const getStatusLabel = (invoice) => {
    if (invoice?.is_canceled) return "Cancelada";
    if (invoice?.uuid) return "Timbrada";
    return "Interna";
  };

  const getStatusClass = (invoice) => {
    if (invoice?.is_canceled) return styles.statusCanceled;
    if (invoice?.uuid) return styles.statusStamped;
    return styles.statusInternal;
  };

  const loadBranches = async () => {
    try {
      const { data, error: branchesError } = await supabase
        .from("branches")
        .select("id, name, code, status")
        .eq("status", true)
        .order("name", { ascending: true });

      if (branchesError) throw branchesError;

      setBranches(data || []);
    } catch (err) {
      console.error("Error cargando sucursales:", err);
      setBranches([]);
    }
  };

  const loadInvoices = async () => {
    if (!branch?.id && branchFilter === "current") return;

    try {
      setLoading(true);
      setError("");

      const startDateTime = `${startDate}T00:00:00`;
      const endDateTime = `${endDate}T23:59:59`;

      let query = supabase
        .from("invoices")
        .select(
          `
          id,
          sale_id,
          customer_id,
          uuid,
          serie,
          folio,
          invoice_date,
          cfdi_use,
          payment_method,
          payment_form,
          subtotal,
          tax,
          total,
          pdf_url,
          xml_url,
          is_canceled,
          canceled_at,
          created_at,
          branch_id,
          branches:branch_id (
            id,
            name,
            code
          ),
          customers:customer_id (
            id,
            rfc,
            razon_social,
            fiscal_email,
            postal_code,
            tax_regime
          )
        `
        )
        .gte("created_at", startDateTime)
        .lte("created_at", endDateTime)
        .order("created_at", { ascending: false });

      if (branchFilter === "current") {
        query = query.eq("branch_id", branch.id);
      }

      if (branchFilter !== "current" && branchFilter !== "all") {
        query = query.eq("branch_id", branchFilter);
      }

      const { data, error: invoicesError } = await query;

      if (invoicesError) throw invoicesError;

      setInvoices(data || []);
    } catch (err) {
      console.error("Error cargando historial de facturas:", err);
      setError("No se pudo cargar el historial de facturas.");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoiceDetail = async (invoice) => {
    if (!invoice?.id) return;

    try {
      setLoadingDetail(true);
      setError("");
      setSelectedInvoice(invoice);

      const { data, error: itemsError } = await supabase
        .from("invoice_items")
        .select(
          `
          id,
          invoice_id,
          product_id,
          description,
          clave_prod_serv,
          quantity,
          unit_price,
          discount,
          tax_rate,
          tax_amount,
          total,
          created_at
        `
        )
        .eq("invoice_id", invoice.id)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      setInvoiceItems(data || []);
    } catch (err) {
      console.error("Error cargando detalle de factura:", err);
      setError("No se pudo cargar el detalle de la factura.");
      setInvoiceItems([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [branch?.id, startDate, endDate, branchFilter]);

  const filteredInvoices = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return invoices;

    return invoices.filter((invoice) => {
      const customer = invoice.customers || {};
      const invoiceBranch = invoice.branches || {};

      const values = [
        getDisplayFolio(invoice),
        invoice.uuid,
        customer.rfc,
        customer.razon_social,
        customer.fiscal_email,
        invoice.cfdi_use,
        invoice.payment_method,
        invoice.payment_form,
        getStatusLabel(invoice),
        getBranchLabel(invoiceBranch),
      ];

      return values.some((value) =>
        String(value || "").toLowerCase().includes(search)
      );
    });
  }, [invoices, searchTerm]);

  const totalFacturado = useMemo(() => {
    return filteredInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.total || 0),
      0
    );
  }, [filteredInvoices]);

  const tableColSpan = isGlobalView ? 9 : 8;

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>HISTORIAL DE FACTURAS</h1>
          <p>Consulta las facturas internas, timbradas o canceladas.</p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={loadInvoices}
          disabled={loading}
        >
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Desde</label>
          <input
            type="date"
            className={styles.dateInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={endDate || new Date().toISOString().split("T")[0]}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Hasta</label>
          <input
            type="date"
            className={styles.dateInput}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            max={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Sucursal</label>
          <select
            className={styles.dateInput}
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="current">
              Actual: {getBranchLabel(branch)}
            </option>
            <option value="all">Todas las sucursales</option>

            {branches.map((branchItem) => (
              <option key={branchItem.id} value={branchItem.id}>
                {getBranchLabel(branchItem)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.searchContainer}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por folio, UUID, RFC, razón social, sucursal o estado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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

      {isGlobalView && (
        <div className={styles.warningBox}>
          Vista global activa: se mostrarán facturas de todas las sucursales.
          Esta opción deberá protegerse con autorización administrativa antes
          de entregar el sistema a cajeros.
        </div>
      )}

      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <span>Facturas encontradas</span>
          <strong>{filteredInvoices.length}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Total facturado</span>
          <strong>{formatCurrency(totalFacturado)}</strong>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.invoicesTable}>
          <thead>
            <tr>
              <th>Folio</th>
              <th>Fecha</th>
              {isGlobalView && <th>Sucursal</th>}
              <th>RFC</th>
              <th>Razón social</th>
              <th>Uso CFDI</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={tableColSpan} className={styles.textCenter}>
                  Cargando facturas...
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={tableColSpan} className={styles.textCenter}>
                  No se encontraron facturas para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className={styles.folioCell}>
                    {getDisplayFolio(invoice)}
                  </td>

                  <td>{formatDateTime(invoice.created_at)}</td>

                  {isGlobalView && (
                    <td>{getBranchLabel(invoice.branches)}</td>
                  )}

                  <td>{invoice.customers?.rfc || "SIN RFC"}</td>

                  <td className={styles.customerCell}>
                    {invoice.customers?.razon_social || "SIN RAZÓN SOCIAL"}
                  </td>

                  <td>{invoice.cfdi_use || "—"}</td>

                  <td className={styles.totalCell}>
                    {formatCurrency(invoice.total)}
                  </td>

                  <td>
                    <span
                      className={`${styles.statusBadge} ${getStatusClass(
                        invoice
                      )}`}
                    >
                      {getStatusLabel(invoice)}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className={styles.viewButton}
                      onClick={() => loadInvoiceDetail(invoice)}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedInvoice && (
        <div className={styles.detailOverlay}>
          <div className={styles.detailModal}>
            <div className={styles.detailHeader}>
              <div>
                <h2>Detalle de factura</h2>
                <p>Folio {getDisplayFolio(selectedInvoice)}</p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => {
                  setSelectedInvoice(null);
                  setInvoiceItems([]);
                }}
              >
                ✕
              </button>
            </div>

            <div className={styles.detailContent}>
              {loadingDetail ? (
                <div className={styles.textCenter}>
                  Cargando detalle de factura...
                </div>
              ) : (
                <>
                  <section className={styles.detailSection}>
                    <h3>Datos fiscales</h3>

                    <div className={styles.infoGrid}>
                      <div>
                        <span>RFC</span>
                        <strong>
                          {selectedInvoice.customers?.rfc || "SIN RFC"}
                        </strong>
                      </div>

                      <div>
                        <span>Razón social</span>
                        <strong>
                          {selectedInvoice.customers?.razon_social ||
                            "SIN RAZÓN SOCIAL"}
                        </strong>
                      </div>

                      <div>
                        <span>Régimen fiscal</span>
                        <strong>
                          {selectedInvoice.customers?.tax_regime ||
                            "SIN RÉGIMEN"}
                        </strong>
                      </div>

                      <div>
                        <span>Código postal fiscal</span>
                        <strong>
                          {selectedInvoice.customers?.postal_code ||
                            "SIN CÓDIGO POSTAL"}
                        </strong>
                      </div>

                      <div>
                        <span>Uso CFDI</span>
                        <strong>{selectedInvoice.cfdi_use || "—"}</strong>
                      </div>

                      <div>
                        <span>Sucursal</span>
                        <strong>{getBranchLabel(selectedInvoice.branches)}</strong>
                      </div>

                      <div>
                        <span>Estado</span>
                        <strong>{getStatusLabel(selectedInvoice)}</strong>
                      </div>
                    </div>
                  </section>

                  <section className={styles.detailSection}>
                    <h3>Conceptos</h3>

                    <div className={styles.tableContainer}>
                      <table className={styles.itemsTable}>
                        <thead>
                          <tr>
                            <th>Descripción</th>
                            <th>Clave SAT</th>
                            <th>Cant.</th>
                            <th>Precio</th>
                            <th>Desc.</th>
                            <th>IVA</th>
                            <th>Total</th>
                          </tr>
                        </thead>

                        <tbody>
                          {invoiceItems.length === 0 ? (
                            <tr>
                              <td colSpan="7" className={styles.textCenter}>
                                No hay conceptos registrados.
                              </td>
                            </tr>
                          ) : (
                            invoiceItems.map((item) => (
                              <tr key={item.id}>
                                <td>{item.description}</td>
                                <td>{item.clave_prod_serv || "—"}</td>
                                <td>{item.quantity}</td>
                                <td>{formatCurrency(item.unit_price)}</td>
                                <td>{formatCurrency(item.discount)}</td>
                                <td>{formatCurrency(item.tax_amount)}</td>
                                <td>{formatCurrency(item.total)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className={styles.summary}>
                    <div>
                      <span>Subtotal</span>
                      <strong>
                        {formatCurrency(selectedInvoice.subtotal)}
                      </strong>
                    </div>

                    <div>
                      <span>IVA</span>
                      <strong>{formatCurrency(selectedInvoice.tax)}</strong>
                    </div>

                    <div className={styles.totalBox}>
                      <span>Total</span>
                      <strong>{formatCurrency(selectedInvoice.total)}</strong>
                    </div>
                  </section>

                  <section className={styles.disabledActions}>
                    <button type="button" disabled>
                      Descargar PDF
                    </button>
                    <button type="button" disabled>
                      Descargar XML
                    </button>
                    <button type="button" disabled>
                      Cancelar CFDI
                    </button>
                    <small>
                      Estas acciones estarán disponibles cuando se integre
                      Facturama.
                    </small>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceHistory;