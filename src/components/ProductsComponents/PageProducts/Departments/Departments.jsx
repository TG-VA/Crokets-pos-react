import React from "react";
import AppModal from "../../../AppModal/AppModal";
import styles from "./Departments.module.css";
import { useDepartments } from "./hooks/useDepartments";

const Departments = () => {
  const {
    selectedId,
    saving,
    formData,
    setFormData,
    sortedDepartments,
    selectedDept,
    appModal,
    closeAppModal,
    handleCreate,
    handleSelect,
    handleSave,
    handleToggleStatus,
  } = useDepartments();

  return (
    <>
      <div className={styles.container}>
        <div className={styles.sidebar}>
          <button
            type="button"
            className={`${styles.sidebarHeader} ${
              selectedId === "new" ? styles.activeItem : ""
            }`}
            onClick={handleCreate}
          >
            + Crear nuevo departamento
          </button>

          <ul className={styles.departmentList}>
            {sortedDepartments.map((dept) => {
              const isInactive = dept.status === false;

              return (
                <li
                  key={dept.id}
                  className={`${styles.departmentItem} ${
                    selectedId === dept.id ? styles.activeItem : ""
                  } ${isInactive ? styles.inactiveItem : ""}`}
                  onClick={() => handleSelect(dept.id)}
                >
                  <div className={styles.departmentName}>{dept.name}</div>

                  <span
                    className={`${styles.statusBadge} ${
                      isInactive ? styles.statusInactive : styles.statusActive
                    }`}
                  >
                    {isInactive ? "Inactivo" : "Activo"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={styles.content}>
          <div className={styles.contentHeader}>
            <div>
              <h2 className={styles.formTitle}>
                {selectedId === "new"
                  ? "Nuevo departamento"
                  : "Detalles del departamento"}
              </h2>

              <p className={styles.subtitle}>
                {selectedId === "new"
                  ? "Crea departamentos para clasificar los productos del catálogo."
                  : "Edita el nombre o cambia el estatus del departamento."}
              </p>
            </div>

            {selectedId !== "new" && selectedDept && (
              <span
                className={`${styles.headerBadge} ${
                  selectedDept.status === false
                    ? styles.statusInactive
                    : styles.statusActive
                }`}
              >
                {selectedDept.status === false ? "Inactivo" : "Activo"}
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nombre *</label>

              <input
                className={styles.input}
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value.toUpperCase(),
                  })
                }
                placeholder="Nombre del departamento"
                disabled={saving}
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Estatus</label>

              <select
                className={styles.input}
                value={formData.status ? "active" : "inactive"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value === "active",
                  })
                }
                disabled={saving}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Genera comisión</label>

              <select
                className={styles.input}
                value={formData.commission_enabled ? "activo" : "inactivo"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    commission_enabled: e.target.value === "activo",
                  })
                }
                disabled={saving}
              >
                <option value="inactivo">Inactivo</option>
                <option value="activo">Activo</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Tipo de comisión</label>

              <select
                className={styles.input}
                value={formData.commission_type || "percent"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    commission_type: e.target.value,
                  })
                }
                disabled={saving || !formData.commission_enabled}
              >
                <option value="percent">Porcentaje (%)</option>
                <option value="flat">Monto Fijo (Moneda)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                {formData.commission_type === "percent" ? "Porcentaje de comisión (%)" : "Valor de comisión"}
              </label>

              <input
                className={styles.input}
                type="number"
                inputMode="decimal"
                step="0.01"
                value={formData.commission_value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    commission_value: e.target.value,
                  })
                }
                placeholder={formData.commission_type === "percent" ? "Ej. 10" : "Ej. 20.00"}
                disabled={saving || !formData.commission_enabled}
              />
            </div>

            <div className={styles.actions}>
              <button
                type="submit"
                className={`${styles.button} ${styles.primaryButton}`}
                disabled={saving}
              >
                {saving
                  ? "Guardando..."
                  : selectedId === "new"
                  ? "Guardar"
                  : "Actualizar información"}
              </button>

              {selectedId !== "new" && selectedDept && (
                <button
                  type="button"
                  className={`${styles.button} ${
                    selectedDept.status === false
                      ? styles.successButton
                      : styles.dangerButton
                  }`}
                  onClick={handleToggleStatus}
                  disabled={saving}
                >
                  {selectedDept.status === false
                    ? "Activar departamento"
                    : "Desactivar departamento"}
                </button>
              )}
            </div>
          </form>
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
        loading={saving}
        onConfirm={appModal.onConfirm || closeAppModal}
        onCancel={appModal.onCancel || closeAppModal}
        onClose={closeAppModal}
      />
    </>
  );
};

export default Departments;