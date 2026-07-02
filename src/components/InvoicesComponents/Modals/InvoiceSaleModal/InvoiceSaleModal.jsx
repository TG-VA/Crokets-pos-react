import React, { useEffect, useMemo, useState } from "react";
import styles from "./InvoiceSaleModal.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import { useAuth } from "../../../../contexts/AuthContext";
import { useBranch } from "../../../../contexts/BranchContext";
import AppModal from "../../../AppModal/AppModal";

const DEFAULT_CLAVE_PROD_SERV = "01010101";
const DEFAULT_PAYMENT_METHOD = "PUE";
const DEFAULT_PAYMENT_FORM = "99";

const InvoiceSaleModal = ({ isOpen, onClose, sale, onSaved }) => {
  const { user } = useAuth();
  const { branch } = useBranch();

  const [saleDetails, setSaleDetails] = useState([]);
  const [salePayments, setSalePayments] = useState([]);
  const [fiscalCustomers, setFiscalCustomers] = useState([]);
  const [cfdiUses, setCfdiUses] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCfdiUse, setSelectedCfdiUse] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  const [postalInfo, setPostalInfo] = useState(null);
  const [postalLoading, setPostalLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [appModal, setAppModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "Entendido",
    cancelText: "Cancelar",
    showCancel: false,
    loading: false,
    onConfirm: null,
    onCancel: null,
  });

  const closeAppModal = () => {
    setAppModal((prev) => ({
      ...prev,
      isOpen: false,
      loading: false,
      onConfirm: null,
      onCancel: null,
    }));
  };

  const showAppAlert = ({
    type = "info",
    title = "Aviso",
    message = "",
    confirmText = "Entendido",
    onConfirm = null,
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText: "Cancelar",
      showCancel: false,
      loading: false,
      onConfirm: onConfirm || closeAppModal,
      onCancel: closeAppModal,
    });
  };

  const showAppConfirm = ({
    type = "warning",
    title = "Confirmar acción",
    message = "",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    onConfirm,
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      showCancel: true,
      loading: false,
      onConfirm: async () => {
        closeAppModal();

        if (onConfirm) {
          await onConfirm();
        }
      },
      onCancel: closeAppModal,
    });
  };

  const getDisplayFolio = (saleData) => {
    if (!saleData?.id) return "—";
    return saleData.id.slice(0, 8).toUpperCase();
  };

  const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

  const saleCustomer = sale?.customers || null;

  const isCustomerReady = (customer) =>
    !!customer?.id &&
    !!customer?.rfc &&
    !!customer?.razon_social &&
    !!customer?.tax_regime &&
    !!customer?.postal_code &&
    customer?.status !== false;

  const selectedCustomerReady = isCustomerReady(selectedCustomer);

  const invoiceTotals = useMemo(() => {
    return {
      subtotal: Number(sale?.subtotal || 0),
      tax: Number(sale?.tax || 0),
      total: Number(sale?.total || 0),
    };
  }, [sale]);

  const lookupPostalCode = async (postalCode) => {
    const cp = String(postalCode || "").replace(/\D/g, "").slice(0, 5);

    setPostalInfo(null);

    if (cp.length !== 5) return;

    try {
      setPostalLoading(true);

      const { data, error: postalError } = await supabase
        .from("postal_codes")
        .select("postal_code, municipality, state, city")
        .eq("postal_code", cp)
        .eq("status", true)
        .limit(1);

      if (postalError) throw postalError;

      if (!data || data.length === 0) {
        setPostalInfo(null);
        return;
      }

      setPostalInfo(data[0]);
    } catch (err) {
      console.error("Error consultando código postal:", err);
      setPostalInfo(null);
    } finally {
      setPostalLoading(false);
    }
  };

  const loadSaleData = async () => {
    if (!sale?.id) return;

    try {
      setLoading(true);
      setError("");

      const [detailsRes, paymentsRes] = await Promise.all([
        supabase
          .from("sale_details")
          .select(`
            id,
            sale_id,
            product_id,
            quantity,
            unit_price,
            total_price,
            original_unit_price,
            final_unit_price,
            discount_amount,
            products:product_id (
              id,
              name,
              barcode,
              sale_price
            )
          `)
          .eq("sale_id", sale.id),

        supabase
          .from("sale_payments")
          .select(`
            id,
            sale_id,
            payment_method_id,
            amount,
            currency,
            exchange_rate,
            reference
          `)
          .eq("sale_id", sale.id),
      ]);

      if (detailsRes.error) throw detailsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      setSaleDetails(detailsRes.data || []);
      setSalePayments(paymentsRes.data || []);
    } catch (err) {
      console.error("Error cargando información de venta:", err);
      setError("No se pudo cargar la información de la venta.");
      setSaleDetails([]);
      setSalePayments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFiscalCustomers = async () => {
    try {
      setLoadingCustomers(true);

      const { data, error: customersError } = await supabase
        .from("customers")
        .select(`
          id,
          phone,
          email,
          fiscal_email,
          rfc,
          razon_social,
          postal_code,
          tax_regime,
          cfdi_use,
          address,
          status,
          is_billing_customer
        `)
        .eq("is_billing_customer", true)
        .eq("status", true)
        .order("razon_social", { ascending: true });

      if (customersError) throw customersError;

      setFiscalCustomers(data || []);
    } catch (err) {
      console.error("Error cargando clientes fiscales:", err);
      setError("No se pudieron cargar los clientes fiscales.");
      setFiscalCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadCfdiUses = async () => {
    try {
      const { data, error: cfdiError } = await supabase
        .from("cfdi_uses")
        .select("id, description")
        .eq("status", true)
        .order("id", { ascending: true });

      if (cfdiError) throw cfdiError;

      setCfdiUses(data || []);
    } catch (err) {
      console.error("Error cargando usos CFDI:", err);
      setError("No se pudieron cargar los usos CFDI.");
      setCfdiUses([]);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setCustomerSearch("");
    setSaleDetails([]);
    setSalePayments([]);
    setSelectedCustomer(null);
    setSelectedCfdiUse("");
    setPostalInfo(null);

    if (isCustomerReady(saleCustomer)) {
      setSelectedCustomer(saleCustomer);
      setSelectedCfdiUse(saleCustomer.cfdi_use || "");
      lookupPostalCode(saleCustomer.postal_code);
    }

    loadSaleData();
    loadFiscalCustomers();
    loadCfdiUses();
  }, [isOpen, sale?.id]);

  useEffect(() => {
    if (selectedCustomer?.cfdi_use) {
      setSelectedCfdiUse(selectedCustomer.cfdi_use);
    }

    if (selectedCustomer?.postal_code) {
      lookupPostalCode(selectedCustomer.postal_code);
    } else {
      setPostalInfo(null);
    }
  }, [selectedCustomer]);

  const filteredFiscalCustomers = useMemo(() => {
    const search = customerSearch.trim().toLowerCase();

    if (!search) return fiscalCustomers;

    return fiscalCustomers.filter((customer) => {
      const values = [
        customer.rfc,
        customer.razon_social,
        customer.phone,
        customer.fiscal_email,
        customer.email,
        customer.postal_code,
      ];

      return values.some((value) =>
        String(value || "").toLowerCase().includes(search)
      );
    });
  }, [fiscalCustomers, customerSearch]);

  const validateBeforeSave = () => {
    if (!sale?.id) return "No se encontró la venta.";
    if (!branch?.id) return "No se encontró la sucursal.";
    if (!user?.id) return "No se encontró el usuario.";
    if (!selectedCustomerReady) {
      return "Selecciona un cliente fiscal con datos completos.";
    }
    if (!selectedCfdiUse) {
      return "Selecciona el uso CFDI para esta factura.";
    }
    if (saleDetails.length === 0) {
      return "La venta no tiene productos o servicios.";
    }

    return "";
  };

  const buildInvoiceItems = (invoiceId) => {
    return saleDetails.map((item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.final_unit_price || item.unit_price || 0);
      const discount = Number(item.discount_amount || 0);
      const lineSubtotal = quantity * unitPrice - discount;
      const taxRate = 16;
      const taxAmount = Number((lineSubtotal * 0.16).toFixed(2));
      const total = Number((lineSubtotal + taxAmount).toFixed(2));

      return {
        invoice_id: invoiceId,
        product_id: item.product_id || null,
        description: item.products?.name || "CONCEPTO FACTURADO",
        clave_prod_serv: DEFAULT_CLAVE_PROD_SERV,
        quantity,
        unit_price: unitPrice,
        discount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        branch_id: branch.id,
        created_at: new Date().toISOString(),
      };
    });
  };

  const buildInvoicePayments = (invoiceId) => {
    if (!salePayments.length) return [];

    return salePayments.map((payment) => ({
      invoice_id: invoiceId,
      payment_method_id: payment.payment_method_id,
      amount: Number(payment.amount || 0),
      currency: payment.currency || "MXN",
      created_at: new Date().toISOString(),
    }));
  };

  const executeSaveInvoice = async () => {
    try {
      setSaving(true);
      setError("");

      const { data: existingInvoice, error: existingError } = await supabase
        .from("invoices")
        .select("id")
        .eq("sale_id", sale.id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingInvoice?.id) {
        setError("Esta venta ya tiene una factura registrada.");
        return;
      }

      const invoicePayload = {
        sale_id: sale.id,
        customer_id: selectedCustomer.id,
        branch_id: branch.id,
        user_id: user.id,
        cfdi_use: selectedCfdiUse,
        payment_method: DEFAULT_PAYMENT_METHOD,
        payment_form: DEFAULT_PAYMENT_FORM,
        subtotal: Number(invoiceTotals.subtotal || 0),
        tax: Number(invoiceTotals.tax || 0),
        total: Number(invoiceTotals.total || 0),
        is_canceled: false,
        invoice_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert(invoicePayload)
        .select("id")
        .single();

      if (invoiceError) throw invoiceError;

      const invoiceId = invoiceData.id;
      const invoiceItems = buildInvoiceItems(invoiceId);

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      const invoicePayments = buildInvoicePayments(invoiceId);

      if (invoicePayments.length > 0) {
        const { error: paymentsError } = await supabase
          .from("invoice_payments")
          .insert(invoicePayments);

        if (paymentsError) throw paymentsError;
      }

      if (onSaved) await onSaved();

      showAppAlert({
        type: "success",
        title: "Factura generada",
        message: "Factura interna generada correctamente.",
        confirmText: "Aceptar",
        onConfirm: () => {
          closeAppModal();
          onClose();
        },
      });
    } catch (err) {
      console.error("Error generando factura interna:", err);
      setError("No se pudo generar la factura interna.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInvoice = async () => {
    const validationError = validateBeforeSave();

    if (validationError) {
      setError(validationError);
      return;
    }

    showAppConfirm({
      type: "warning",
      title: "Generar factura interna",
      message: `¿Deseas generar la factura interna de la venta ${getDisplayFolio(
        sale
      )}?\n\nRFC: ${selectedCustomer.rfc}\nRazón social: ${
        selectedCustomer.razon_social
      }\nUso CFDI: ${selectedCfdiUse}\nTotal: ${formatCurrency(sale.total)}`,
      confirmText: "Sí, generar",
      cancelText: "Cancelar",
      onConfirm: executeSaveInvoice,
    });
  };

  const selectedCfdiDescription =
    cfdiUses.find((item) => item.id === selectedCfdiUse)?.description || "";

  useEffect(() => {
    if (!isOpen) return;

    const handleEscKey = (e) => {
      if (e.key !== "Escape") return;

      e.preventDefault();
      e.stopPropagation();

      if (appModal.isOpen) {
        closeAppModal();
        return;
      }

      if (!saving) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscKey, true);

    return () => {
      document.removeEventListener("keydown", handleEscKey, true);
    };
  }, [isOpen, appModal.isOpen, saving, onClose]);

  if (!isOpen || !sale) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2>Facturar venta</h2>
            <p>Venta #{getDisplayFolio(sale)}</p>
          </div>

          <button type="button" className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.content}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h3>Cliente fiscal</h3>
                <p>
                  Selecciona el cliente fiscal que se usará para esta factura.
                </p>
              </div>
            </div>

            {selectedCustomerReady ? (
              <div className={styles.selectedCustomerBox}>
                <div>
                  <span>Cliente seleccionado</span>
                  <strong>{selectedCustomer.razon_social}</strong>
                  <small>{selectedCustomer.rfc}</small>
                </div>

                <button
                  type="button"
                  className={styles.changeCustomerButton}
                  onClick={() => {
                    setSelectedCustomer(null);
                    setSelectedCfdiUse("");
                    setPostalInfo(null);
                  }}
                >
                  Cambiar cliente
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  className={styles.customerSearchInput}
                  placeholder="Buscar por RFC, razón social, teléfono o correo..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />

                <div className={styles.customerList}>
                  {loadingCustomers ? (
                    <div className={styles.emptyState}>
                      Cargando clientes fiscales...
                    </div>
                  ) : filteredFiscalCustomers.length === 0 ? (
                    <div className={styles.emptyState}>
                      No se encontraron clientes fiscales. Regístralo primero
                      desde Clientes fiscales.
                    </div>
                  ) : (
                    filteredFiscalCustomers.map((customerItem) => (
                      <button
                        type="button"
                        key={customerItem.id}
                        className={styles.customerCard}
                        onClick={() => {
                          setSelectedCustomer(customerItem);
                          setSelectedCfdiUse(customerItem.cfdi_use || "");
                        }}
                      >
                        <strong>{customerItem.razon_social}</strong>
                        <span>
                          RFC: {customerItem.rfc} · Tel:{" "}
                          {customerItem.phone || "—"}
                        </span>
                        <span>
                          Correo:{" "}
                          {customerItem.fiscal_email ||
                            customerItem.email ||
                            "—"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </section>

          <section className={styles.section}>
            <h3>Datos fiscales</h3>

            <div className={styles.infoGrid}>
              <div>
                <span>RFC</span>
                <strong>{selectedCustomer?.rfc || "SIN RFC"}</strong>
              </div>

              <div>
                <span>Razón social</span>
                <strong>
                  {selectedCustomer?.razon_social || "SIN RAZÓN SOCIAL"}
                </strong>
              </div>

              <div>
                <span>Régimen fiscal</span>
                <strong>{selectedCustomer?.tax_regime || "SIN RÉGIMEN"}</strong>
              </div>

              <div>
                <span>Código postal</span>
                <strong>
                  {selectedCustomer?.postal_code || "SIN CÓDIGO POSTAL"}
                </strong>

                {postalLoading && (
                  <small className={styles.cfdiHelp}>
                    Validando código postal...
                  </small>
                )}

                {postalInfo && (
                  <small className={styles.locationInfo}>
                    {postalInfo.city ? `${postalInfo.city}, ` : ""}
                    {postalInfo.municipality}, {postalInfo.state}
                  </small>
                )}
              </div>

              <div>
                <span>Correo fiscal</span>
                <strong>
                  {selectedCustomer?.fiscal_email ||
                    selectedCustomer?.email ||
                    "SIN CORREO"}
                </strong>
              </div>

              <div>
                <span>Uso CFDI para esta factura</span>
                <select
                  className={styles.cfdiSelect}
                  value={selectedCfdiUse}
                  onChange={(e) => setSelectedCfdiUse(e.target.value)}
                  disabled={!selectedCustomerReady}
                >
                  <option value="">Selecciona uso CFDI</option>
                  {cfdiUses.map((use) => (
                    <option key={use.id} value={use.id}>
                      {use.id} - {use.description}
                    </option>
                  ))}
                </select>

                {selectedCfdiDescription && (
                  <small className={styles.cfdiHelp}>
                    {selectedCfdiDescription}
                  </small>
                )}
              </div>
            </div>

            {!selectedCustomerReady && (
              <div className={styles.warningBox}>
                Selecciona un cliente fiscal para poder generar la factura.
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h3>Productos y servicios</h3>

            <div className={styles.tableContainer}>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>Desc.</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className={styles.textCenter}>
                        Cargando conceptos...
                      </td>
                    </tr>
                  ) : saleDetails.length === 0 ? (
                    <tr>
                      <td colSpan="5" className={styles.textCenter}>
                        No hay conceptos para facturar.
                      </td>
                    </tr>
                  ) : (
                    saleDetails.map((item) => (
                      <tr key={item.id}>
                        <td>{item.products?.name || "CONCEPTO FACTURADO"}</td>
                        <td>{item.quantity}</td>
                        <td>
                          {formatCurrency(
                            item.final_unit_price || item.unit_price
                          )}
                        </td>
                        <td>{formatCurrency(item.discount_amount || 0)}</td>
                        <td>{formatCurrency(item.total_price)}</td>
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
              <strong>{formatCurrency(invoiceTotals.subtotal)}</strong>
            </div>

            <div>
              <span>IVA</span>
              <strong>{formatCurrency(invoiceTotals.tax)}</strong>
            </div>

            <div className={styles.totalBox}>
              <span>Total</span>
              <strong>{formatCurrency(invoiceTotals.total)}</strong>
            </div>
          </section>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSaveInvoice}
            disabled={
              saving ||
              loading ||
              postalLoading ||
              !selectedCustomerReady ||
              !selectedCfdiUse
            }
          >
            {saving ? "Generando..." : "Generar factura interna"}
          </button>
        </div>
      </div>

      <AppModal
        isOpen={appModal.isOpen}
        type={appModal.type}
        title={appModal.title}
        message={appModal.message}
        confirmText={appModal.confirmText}
        cancelText={appModal.cancelText}
        showCancel={appModal.showCancel}
        loading={appModal.loading}
        onConfirm={appModal.onConfirm || closeAppModal}
        onCancel={appModal.onCancel || closeAppModal}
        onClose={closeAppModal}
      />
    </div>
  );
};

export default InvoiceSaleModal;