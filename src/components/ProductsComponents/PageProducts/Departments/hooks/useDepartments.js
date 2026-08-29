import { useState, useMemo, useEffect } from "react";
import { useProducts } from "../../../../../contexts/ProductsContext";
import { useAppModal } from "../../../../../hooks/useAppModal";

export const useDepartments = () => {
  const { departments, addDepartment, updateDepartment } = useProducts();
  const { appModal, closeAppModal, showAppAlert, showAppConfirm } = useAppModal();

  const [selectedId, setSelectedId] = useState("new");
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    status: true,
    commission_enabled: false,
    commission_type: "percent",
    commission_value: "",
  });

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
        commission_enabled: false,
        commission_type: "percent",
        commission_value: "",
      });
      return;
    }

    if (selectedDept) {
      setFormData({
        name: selectedDept.name || "",
        status: selectedDept.status !== false,
        commission_enabled: !!selectedDept.commission_enabled,
        commission_type: selectedDept.commission_type || "percent",
        commission_value: selectedDept.commission_value !== undefined && selectedDept.commission_value !== null ? selectedDept.commission_value.toString() : "",
      });
    } else {
      setSelectedId("new");
    }
  }, [selectedId, selectedDept]);

  const handleCreate = () => setSelectedId("new");
  const handleSelect = (id) => setSelectedId(id);

  const validateDuplicateName = () => {
    const cleanName = formData.name.trim().toLowerCase();
    return departments.some(
      (department) =>
        department.id !== selectedId &&
        department.name?.trim().toLowerCase() === cleanName
    );
  };

  const handleSave = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    const cleanName = formData.name.trim();

    if (!cleanName) {
      showAppAlert({
        type: "warning",
        title: "Nombre requerido",
        message: "El nombre del departamento es obligatorio.",
      });
      return;
    }

    if (validateDuplicateName()) {
      showAppAlert({
        type: "warning",
        title: "Nombre duplicado",
        message: "Ya existe un departamento con ese nombre.",
      });
      return;
    }

    if (formData.commission_enabled && (!formData.commission_value || parseFloat(formData.commission_value) < 0)) {
      showAppAlert({
        type: "warning",
        title: "Comisión inválida",
        message: "Por favor, captura un valor de comisión válido (no negativo).",
      });
      return;
    }

    try {
      if (selectedId === "new") {
        try {
          setSaving(true);
          const success = await addDepartment(cleanName, {
            commission_enabled: !!formData.commission_enabled,
            commission_type: formData.commission_type || "percent",
            commission_value: parseFloat(formData.commission_value) || 0,
          });

          if (!success) {
            console.error("Error al crear el departamento.");
            showAppAlert({
              type: "danger",
              title: "No se pudo crear",
              message: "No se pudo crear el departamento.",
            });
            return;
          }

          showAppAlert({
            type: "success",
            title: "Departamento creado",
            message: "Departamento creado correctamente.",
          });

          setFormData({
            name: "",
            status: true,
            commission_enabled: false,
            commission_type: "percent",
            commission_value: "",
          });
          setSelectedId("new");
        } finally {
          setSaving(false);
        }
        return;
      }

      const saveData = async (propagateToProducts = false) => {
        try {
          setSaving(true);
          const success = await updateDepartment(selectedId, {
            name: cleanName,
            status: formData.status,
            commission_enabled: !!formData.commission_enabled,
            commission_type: formData.commission_type || "percent",
            commission_value: parseFloat(formData.commission_value) || 0,
            propagateToProducts,
          });

          if (!success) {
            console.error("Error al actualizar el departamento.");
            showAppAlert({
              type: "danger",
              title: "No se pudo actualizar",
              message: "No se pudo actualizar el departamento.",
            });
            return;
          }

          showAppAlert({
            type: "success",
            title: "Departamento actualizado",
            message: propagateToProducts
              ? "Departamento actualizado y comisión aplicada a sus productos correctamente."
              : "Departamento actualizado correctamente.",
          });
        } catch (err) {
          console.error("Error al actualizar el departamento:", err);
          showAppAlert({
            type: "danger",
            title: "Error de red",
            message: "Ocurrió un error al intentar comunicarse con el servidor.",
          });
        } finally {
          setSaving(false);
        }
      };

      const hasCommissionChanged = selectedDept && (
        !!selectedDept.commission_enabled !== !!formData.commission_enabled ||
        (selectedDept.commission_type || "percent") !== formData.commission_type ||
        Number(selectedDept.commission_value || 0) !== (parseFloat(formData.commission_value) || 0)
      );

      if (hasCommissionChanged) {
        showAppConfirm({
          type: "info",
          title: "Actualizar comisión de productos",
          message: "¿Deseas aplicar los cambios de comisión de este departamento a todos los productos que pertenecen a él? Ten en cuenta que esto sobrescribirá cualquier comisión individual que tengan configurada.",
          confirmText: "Sí, aplicar a productos",
          cancelText: "No, solo guardar departamento",
          onConfirm: () => saveData(true),
          onCancel: () => saveData(false),
        });
      } else {
        await saveData(false);
      }
    } catch (error) {
      console.error("Error al guardar departamento:", error);
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
        console.error("Error al cambiar el estatus del departamento.");
        showAppAlert({
          type: "danger",
          title: "No se pudo cambiar el estatus",
          message: "No se pudo cambiar el estatus del departamento.",
        });
        return;
      }

      setFormData((prev) => ({ ...prev, status: nextStatus }));

      showAppAlert({
        type: "success",
        title: nextStatus ? "Departamento activado" : "Departamento desactivado",
        message: nextStatus
          ? "Departamento activado correctamente."
          : "Departamento desactivado correctamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = () => {
    if (!selectedDept) return;

    const currentStatus = selectedDept.status !== false;
    const nextStatus = !currentStatus;

    showAppConfirm({
      type: nextStatus ? "info" : "danger",
      title: nextStatus ? "Activar departamento" : "Desactivar departamento",
      message: nextStatus
        ? `¿Deseas activar el departamento "${selectedDept.name}"?`
        : `¿Deseas desactivar el departamento "${selectedDept.name}"?`,
      confirmText: nextStatus ? "Sí, activar" : "Sí, desactivar",
      cancelText: "Cancelar",
      onConfirm: () => executeToggleStatus(nextStatus),
    });
  };

  return {
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
  };
};