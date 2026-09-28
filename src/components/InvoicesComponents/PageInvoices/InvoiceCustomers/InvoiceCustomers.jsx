import styles from "./InvoiceCustomers.module.css";
import FiscalCustomerModal from "../../Modals/FiscalCustomerModal/FiscalCustomerModal";
import AdminAuthorizationModal from "../../../AdminAuthorizationModal/AdminAuthorizationModal";
import AppModal from "../../../AppModal/AppModal";

import InvoiceCustomersFilters from "./components/InvoiceCustomersFilters";
import InvoiceCustomersPointsMatch from "./components/InvoiceCustomersPointsMatch";
import InvoiceCustomersTable from "./components/InvoiceCustomersTable";
import { useInvoiceCustomers } from "./hooks/useInvoiceCustomers";

const InvoiceCustomers = () => {
  const {
    adminAuthMessage,
    adminAuthOpen,
    appModal,
    branchId,
    cfdiUseMap,
    clearSearch,
    closeAppModal,
    editingCustomer,
    filteredCustomers,
    handleAddPointsCustomerAsFiscalCustomer,
    handleAdminAuthorizedDeactivate,
    handleCloseAdminAuth,
    handleCloseFiscalModal,
    handleEditCustomer,
    handleFiscalSaved,
    handleNewCustomer,
    handleToggleStatus,
    isFiscalModalOpen,
    loadCustomers,
    loadingCustomers,
    pendingDeactivateCustomer,
    pointsMatchTitle,
    pointsCustomerFound,
    searchingPointsCustomer,
    searchTerm,
    setSearchTerm,
    setStatusFilter,
    statusFilter,
    taxRegimeMap,
  } = useInvoiceCustomers();

  const resultsLabel = loadingCustomers
    ? "Cargando clientes fiscales..."
    : `Mostrando ${filteredCustomers.length} cliente${
        filteredCustomers.length !== 1 ? "s" : ""
      } fiscal${filteredCustomers.length !== 1 ? "es" : ""}`;

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>CLIENTES FISCALES</h1>
          <p>
            Administra los clientes que cuentan con información fiscal para
            emitir CFDI.
          </p>
        </div>

        <button
          type="button"
          className={styles.newButton}
          onClick={handleNewCustomer}
        >
          + Agregar datos fiscales
        </button>
      </div>

      <InvoiceCustomersFilters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        loadingCustomers={loadingCustomers}
        onSearchChange={setSearchTerm}
        onStatusFilterChange={setStatusFilter}
        onClearSearch={clearSearch}
        onRefresh={loadCustomers}
      />

      <InvoiceCustomersPointsMatch
        customer={pointsCustomerFound}
        searching={searchingPointsCustomer}
        title={pointsMatchTitle}
        onAddAsFiscalCustomer={handleAddPointsCustomerAsFiscalCustomer}
      />

      <div className={styles.resultsInfo}>{resultsLabel}</div>

      <InvoiceCustomersTable
        customers={filteredCustomers}
        cfdiUseMap={cfdiUseMap}
        taxRegimeMap={taxRegimeMap}
        loadingCustomers={loadingCustomers}
        onEditCustomer={handleEditCustomer}
        onToggleStatus={handleToggleStatus}
      />

      <FiscalCustomerModal
        isOpen={isFiscalModalOpen}
        onClose={handleCloseFiscalModal}
        onSaved={handleFiscalSaved}
        customerToEdit={editingCustomer}
      />

      <AdminAuthorizationModal
        isOpen={adminAuthOpen}
        onClose={handleCloseAdminAuth}
        onAuthorized={handleAdminAuthorizedDeactivate}
        action="deactivate_fiscal_customer"
        title="Acceso restringido"
        message={adminAuthMessage}
        targetId={pendingDeactivateCustomer?.id || null}
        branchId={branchId}
      />

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

export default InvoiceCustomers;
