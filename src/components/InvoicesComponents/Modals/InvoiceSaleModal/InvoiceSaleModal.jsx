import styles from "./InvoiceSaleModal.module.css";
import AppModal from "../../../AppModal/AppModal";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";
import { getShortFolio } from "../../utils/invoiceFormatters";

import InvoiceSaleCustomerSection from "./components/InvoiceSaleCustomerSection";
import InvoiceSaleFiscalDataSection from "./components/InvoiceSaleFiscalDataSection";
import InvoiceSaleFooter from "./components/InvoiceSaleFooter";
import InvoiceSaleItemsSection from "./components/InvoiceSaleItemsSection";
import InvoiceSaleSummary from "./components/InvoiceSaleSummary";
import { useInvoiceSaleModal } from "./hooks/useInvoiceSaleModal";

/**
 * Modal de facturacion interna de una venta.
 *
 * La vista solo compone secciones: el flujo de datos y la escritura de la
 * factura viven en `useInvoiceSaleModal` y sus servicios.
 */
const InvoiceSaleModal = ({ isOpen, onClose, sale, onSaved }) => {
  const {
    appModal,
    cfdiUses,
    closeAppModal,
    customerSearch,
    error,
    filteredFiscalCustomers,
    handleAppModalConfirm,
    handleChangeCustomer,
    handleSaveInvoice,
    handleSelectCustomer,
    invoiceTotals,
    loading,
    loadingCustomers,
    postalInfo,
    postalLoading,
    saleDetails,
    saveDisabled,
    saving,
    selectedCfdiDescription,
    selectedCfdiUse,
    selectedCustomer,
    selectedCustomerReady,
    setCustomerSearch,
    setSelectedCfdiUse,
  } = useInvoiceSaleModal({ isOpen, onClose, sale, onSaved });

  if (!isOpen || !sale) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2>Facturar venta</h2>
            <p>Venta #{getShortFolio(sale)}</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
          >
            <img
              src={XmarkIcon}
              alt=""
              className={styles.closeIcon}
              aria-hidden="true"
            />
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.content}>
          <InvoiceSaleCustomerSection
            filteredFiscalCustomers={filteredFiscalCustomers}
            loadingCustomers={loadingCustomers}
            onChangeCustomer={handleChangeCustomer}
            onCustomerSearchChange={setCustomerSearch}
            onSelectCustomer={handleSelectCustomer}
            searchTerm={customerSearch}
            selectedCustomer={selectedCustomer}
            selectedCustomerReady={selectedCustomerReady}
          />

          <InvoiceSaleFiscalDataSection
            cfdiUses={cfdiUses}
            onCfdiUseChange={setSelectedCfdiUse}
            postalInfo={postalInfo}
            postalLoading={postalLoading}
            selectedCfdiDescription={selectedCfdiDescription}
            selectedCfdiUse={selectedCfdiUse}
            selectedCustomer={selectedCustomer}
            selectedCustomerReady={selectedCustomerReady}
          />

          <InvoiceSaleItemsSection
            loading={loading}
            saleDetails={saleDetails}
          />

          <InvoiceSaleSummary
            subtotal={invoiceTotals.subtotal}
            tax={invoiceTotals.tax}
            total={invoiceTotals.total}
          />
        </div>

        <InvoiceSaleFooter
          onCancel={onClose}
          onSave={handleSaveInvoice}
          saveDisabled={saveDisabled}
          saving={saving}
        />
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
        onConfirm={handleAppModalConfirm}
        onCancel={closeAppModal}
        onClose={closeAppModal}
      />
    </div>
  );
};

export default InvoiceSaleModal;
