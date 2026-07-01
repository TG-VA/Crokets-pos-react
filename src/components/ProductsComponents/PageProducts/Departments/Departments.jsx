import React, { useEffect, useMemo, useState } from "react";
import { useProducts } from "../../../../contexts/ProductsContext";
import AppModal from "../../../AppModal/AppModal";
import styles from "./Departments.module.css";

const INITIAL_MODAL_STATE = {
  isOpen: false,
  type: "info",
  title: "",
  message: "",
  confirmText: "Aceptar",
  cancelText: "Cancelar",
  showCancel: false,
  onConfirmAction: null,
};

const Departments = () => {
  const { departments, addDepartment, updateDepartment } = useProducts();

  const [selectedId, setSelectedId] = useState("new");
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    status: true,
  });

  const [appModal, setAppModal] = useState(INITIAL_MODAL_STATE);

  const selectedDept = useMemo(
    () => departments.find((d) => d.id === selectedId) || null,
    [departments, selectedId]
  );

  const sortedDepartments = useMemo(() => {
    return [...(departments || [])].sort((a, b) => {
      const aIsActive = a.status !== false;
      const bIsActive = b.status !== false;

      if (aIsActive !== bIsActive) {
        return aIsActive ? -1 : 1;
      }

      const nameA = String(a.name || "");
      const nameB = String(b.name || "");

      return nameA.localeCompare(nameB, "es", {
        sensitivity: "base",
        numeric: true,
      });
    });
  }, [departments]);

  useEffect(() => {
    if (selectedId === "new") {
      setFormData({
        name: "",
        status: true,
      });
      return;
    }

    if (selectedDept) {
      setFormData({
        name: selectedDept.name || "",
        status: selectedDept.status !== false,
      });
    } else {
      setSelectedId("new");
    }
  }, [selectedId, selectedDept]);

  const closeAppModal = () => {
    setAppModal(INITIAL_MODAL_STATE);
  };

  const showAlertModal = ({
    type = "warning",
    title = "Aviso",
    message = "",
    confirmText = "Entendido",
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText: "Cancelar",
      showCancel: false,
      onConfirmAction: null,
    });
  };

  const showConfirmModal = ({
    type = "warning",
    title = "Confirmar acción",
    message = "",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    onConfirmAction = null,
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      showCancel: true,
      onConfirmAction,
    });
  };

  const handleAppModalConfirm = async () => {
    const action = appModal.onConfirmAction;

    closeAppModal();

    if (action) {
      await action();
    }
  };

  const handleCreate = () => {
    setSelectedId("new");
  };

  const handleSelect = (id) => {
    setSelectedId(id);
  };

  const validateDuplicateName = () => {
    const cleanName = formData.name.trim().toLowerCase();

    return departments.some(
      (department) =>
        department.id !== selectedId &&
        department.name?.trim().toLowerCase() === cleanName
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const cleanName = formData.name.trim();

    if (!cleanName) {
      showAlertModal({
        type: "warning",
        title: "Nombre requerido",
        message: "El nombre del departamento es obligatorio.",
        confirmText: "Entendido",
      });
      return;
    }

    if (validateDuplicateName()) {
      showAlertModal({
        type: "warning",
        title: "Nombre duplicado",
        message: "Ya existe un departamento con ese nombre.",
        confirmText: "Entendido",
      });
      return;
    }

    try {
      setSaving(true);

      if (selectedId === "new") {
        const success = await addDepartment(cleanName);

        if (!success) {
          showAlertModal({
            type: "danger",
            title: "No se pudo crear",
            message: "No se pudo crear el departamento.",
            confirmText: "Entendido",
          });
          return;
        }

        showAlertModal({
          type: "success",
          title: "Departamento creado",
          message: "Departamento creado correctamente.",
          confirmText: "Aceptar",
        });

        setFormData({
          name: "",
          status: true,
        });
        setSelectedId("new");
        return;
      }

      const success = await updateDepartment(selectedId, {
        name: cleanName,
        status: formData.status,
      });

      if (!success) {
        showAlertModal({
          type: "danger",
          title: "No se pudo actualizar",
          message: "No se pudo actualizar el departamento.",
          confirmText: "Entendido",
        });
        return;
      }

      showAlertModal({
        type: "success",
        title: "Departamento actualizado",
        message: "Departamento actualizado correctamente.",
        confirmText: "Aceptar",
      });
    } finally {
      setSaving(false);
    }
  };

  const executeToggleStatus = async (nextStatus) => {
    if (!selectedDept) return;

    try {
      setSaving(true);

      const success = await updateDepartment(selectedDept.id, {
        name: selectedDept.name,
        status: nextStatus,
      });

      if (!success) {
        showAlertModal({
          type: "danger",
          title: "No se pudo cambiar el estatus",
          message: "No se pudo cambiar el estatus del departamento.",
          confirmText: "Entendido",
        });
        return;
      }

      setFormData((prev) => ({
        ...prev,
        status: nextStatus,
      }));

      showAlertModal({
        type: "success",
        title: nextStatus
          ? "Departamento activado"
          : "Departamento desactivado",
        message: nextStatus
          ? "Departamento activado correctamente."
          : "Departamento desactivado correctamente.",
        confirmText: "Aceptar",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = () => {
    if (!selectedDept) return;

    const currentStatus = selectedDept.status !== false;
    const nextStatus = !currentStatus;

    showConfirmModal({
      type: nextStatus ? "info" : "danger",
      title: nextStatus
        ? "Activar departamento"
        : "Desactivar departamento",
      message: nextStatus
        ? `¿Deseas activar el departamento "${selectedDept.name}"?`
        : `¿Deseas desactivar el departamento "${selectedDept.name}"?`,
      confirmText: nextStatus ? "Sí, activar" : "Sí, desactivar",
      cancelText: "Cancelar",
      onConfirmAction: () => executeToggleStatus(nextStatus),
    });
  };

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
        onConfirm={handleAppModalConfirm}
        onCancel={closeAppModal}
        onClose={closeAppModal}
      />
    </>
  );
};

export default Departments;