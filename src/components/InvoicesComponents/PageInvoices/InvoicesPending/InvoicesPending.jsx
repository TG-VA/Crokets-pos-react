import styles from "./InvoicesPending.module.css";
import InvoiceSaleModal from "../../Modals/InvoiceSaleModal/InvoiceSaleModal";

import InvoicesPendingFilters from "./components/InvoicesPendingFilters";
import InvoicesPendingTable from "./components/InvoicesPendingTable";
import { useInvoicesPending } from "./hooks/useInvoicesPending";

const InvoicesPending = () => {
  const {
    dateFilter,
    error,
    filteredSales,
    handleCloseInvoiceModal,
    handleInvoiceSale,
    handleInvoiceSaved,
    isInvoiceModalOpen,
    loadPendingSales,
    loadingSales,
    searchTerm,
    selectedSale,
    setDateFilter,
    setSearchTerm,
  } = useInvoicesPending();

  const resultsLabel = loadingSales
    ? "Cargando ventas..."
    : `Mostrando ${filteredSales.length} venta${
        filteredSales.length !== 1 ? "s" : ""
      } por facturar`;

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>VENTAS POR FACTURAR</h1>
          <p>
            Ventas completadas de la sucursal actual que aún no tienen factura.
          </p>
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

      <InvoicesPendingFilters
        dateFilter={dateFilter}
        maxDate={new Date().toISOString().split("T")[0]}
        searchTerm={searchTerm}
        onDateChange={setDateFilter}
        onSearchChange={setSearchTerm}
      />

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.resultsInfo}>{resultsLabel}</div>

      <InvoicesPendingTable
        sales={filteredSales}
        loading={loadingSales}
        onInvoice={handleInvoiceSale}
      />

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
