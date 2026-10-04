import styles from "./InvoicesHistory.module.css";

import InvoicesHistoryFilters from "./components/InvoicesHistoryFilters";
import InvoicesHistoryTable from "./components/InvoicesHistoryTable";
import InvoicesHistoryDetail from "./components/InvoicesHistoryDetail";
import { useInvoicesHistory } from "./hooks/useInvoicesHistory";
import { formatCurrency } from "../../utils/invoiceFormatters";

const InvoiceHistory = () => {
  const {
    branch,
    branchFilter,
    branchMaxDate,
    branches,
    closeInvoiceDetail,
    endDate,
    error,
    filteredInvoices,
    invoiceItems,
    isGlobalView,
    loadInvoiceDetail,
    loadInvoices,
    loading,
    loadingDetail,
    searchTerm,
    selectedInvoice,
    setBranchFilter,
    setEndDate,
    setSearchTerm,
    setStartDate,
    startDate,
    tableColSpan,
    totalFacturado,
  } = useInvoicesHistory();

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

      <InvoicesHistoryFilters
        startDate={startDate}
        endDate={endDate}
        branchFilter={branchFilter}
        branches={branches}
        currentBranch={branch}
        branchMaxDate={branchMaxDate}
        searchTerm={searchTerm}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onBranchFilterChange={setBranchFilter}
        onSearchChange={setSearchTerm}
      />

      {isGlobalView && (
        <div className={styles.warningBox}>
          Vista global activa: se mostrarán facturas de todas las sucursales.
          Esta opción deberá protegerse con autorización administrativa antes de
          entregar el sistema a cajeros.
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

      <InvoicesHistoryTable
        invoices={filteredInvoices}
        isGlobalView={isGlobalView}
        tableColSpan={tableColSpan}
        loading={loading}
        onViewInvoice={loadInvoiceDetail}
      />

      <InvoicesHistoryDetail
        invoice={selectedInvoice}
        items={invoiceItems}
        loading={loadingDetail}
        onClose={closeInvoiceDetail}
      />
    </div>
  );
};

export default InvoiceHistory;
