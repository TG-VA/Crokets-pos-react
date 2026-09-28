import styles from "./CustomersList.module.css";
import CustomerModal from "../../Modals/CustomerModal/CustomerModal";

import { useBranch } from "../../../../contexts/BranchContext";
import AdminAuthorizationModal from "../../../AdminAuthorizationModal/AdminAuthorizationModal";
import AppModal from "../../../AppModal/AppModal";
import CustomersListFilters from "./CustomersListFilters";
import CustomersListFiscalMatch from "./CustomersListFiscalMatch";
import CustomersListTable from "./CustomersListTable";
import { useCustomersList } from "./useCustomersList";

const CustomersList = () => {
  const { branch } = useBranch();

  const {
    adminAuthOpen,
    appModal,
    closeAppModal,
    editingCustomer,
    filteredCustomers,
    fiscalCustomerFound,
    handleAddFiscalCustomerAsPointsCustomer,
    handleAdminAuthorized,
    handleClearSearch,
    handleCloseAdminAuth,
    handleCloseCustomerModal,
    handleCustomerSaved,
    handleEditCustomer,
    handleNewCustomer,
    handleToggleStatus,
    isCustomerModalOpen,
    loadCustomers,
    loadingCustomers,
    pendingDeactivateCustomer,
    pointsByCustomer,
    searchTerm,
    searchingFiscalCustomer,
    setSearchTerm,
    setStatusFilter,
    statusFilter,
  } = useCustomersList();

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>CLIENTES</h1>
          <p>
            Administra clientes registrados, datos de contacto, estado y puntos
            acumulados.
          </p>
        </div>

        <button
          type="button"
          className={styles.newButton}
          onClick={handleNewCustomer}
        >
          + Nuevo cliente
        </button>
      </div>

      <CustomersListFilters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        loadingCustomers={loadingCustomers}
        onSearchChange={setSearchTerm}
        onStatusFilterChange={setStatusFilter}
        onClearSearch={handleClearSearch}
        onRefresh={loadCustomers}
      />

      <CustomersListFiscalMatch
        fiscalCustomer={fiscalCustomerFound}
        searching={searchingFiscalCustomer}
        onAddAsPointsCustomer={handleAddFiscalCustomerAsPointsCustomer}
      />

      <CustomersListTable
        customers={filteredCustomers}
        pointsByCustomer={pointsByCustomer}
        loadingCustomers={loadingCustomers}
        onEditCustomer={handleEditCustomer}
        onToggleStatus={handleToggleStatus}
      />

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={handleCloseCustomerModal}
        onSaved={handleCustomerSaved}
        customerToEdit={editingCustomer}
      />

      <AdminAuthorizationModal
        isOpen={adminAuthOpen}
        onClose={handleCloseAdminAuth}
        onAuthorized={handleAdminAuthorized}
        action="customers_deactivate"
        title="Acceso restringido"
        message={
          pendingDeactivateCustomer
            ? `Para desactivar al cliente "${pendingDeactivateCustomer.name}", se requiere autorización de un administrador.`
            : "Para desactivar clientes se requiere autorización de un administrador."
        }
        targetId={pendingDeactivateCustomer?.id || null}
        branchId={branch?.id || null}
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

export default CustomersList;
