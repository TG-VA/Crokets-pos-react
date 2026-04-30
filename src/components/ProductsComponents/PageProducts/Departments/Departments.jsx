import React, { useEffect, useMemo, useState } from "react";
import { useProducts } from "../../../../contexts/ProductsContext";
import styles from "./Departments.module.css";

const Departments = () => {
  const { departments, addDepartment, updateDepartment } = useProducts();

  const [selectedId, setSelectedId] = useState("new");
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    status: true,
  });

  const selectedDept = useMemo(
    () => departments.find((d) => d.id === selectedId) || null,
    [departments, selectedId]
  );

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
      alert("El nombre del departamento es obligatorio.");
      return;
    }

    if (validateDuplicateName()) {
      alert("Ya existe un departamento con ese nombre.");
      return;
    }

    try {
      setSaving(true);

      if (selectedId === "new") {
        const success = await addDepartment(cleanName);

        if (!success) {
          alert("No se pudo crear el departamento.");
          return;
        }

        alert("Departamento creado correctamente.");
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
        alert("No se pudo actualizar el departamento.");
        return;
      }

      alert("Departamento actualizado correctamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedDept) return;

    const nextStatus = !selectedDept.status;

    const confirmMessage = nextStatus
      ? `¿Deseas activar el departamento "${selectedDept.name}"?`
      : `¿Deseas desactivar el departamento "${selectedDept.name}"?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setSaving(true);

      const success = await updateDepartment(selectedDept.id, {
        name: selectedDept.name,
        status: nextStatus,
      });

      if (!success) {
        alert("No se pudo cambiar el estatus del departamento.");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        status: nextStatus,
      }));

      alert(
        nextStatus
          ? "Departamento activado correctamente."
          : "Departamento desactivado correctamente."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
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
          {departments.map((dept) => {
            const isInactive = dept.status === false;

            return (
              <li
                key={dept.id}
                className={`${styles.departmentItem} ${
                  selectedId === dept.id ? styles.activeItem : ""
                } ${isInactive ? styles.inactiveItem : ""}`}
                onClick={() => handleSelect(dept.id)}
              >
                <div className={styles.departmentName}>
                  {dept.name}
                </div>

                <span
                  className={`${styles.statusBadge} ${
                    isInactive
                      ? styles.statusInactive
                      : styles.statusActive
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
              {selectedDept.status === false
                ? "Inactivo"
                : "Activo"}
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Nombre *
            </label>

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
            <label className={styles.label}>
              Estatus
            </label>

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
  );
};

export default Departments;