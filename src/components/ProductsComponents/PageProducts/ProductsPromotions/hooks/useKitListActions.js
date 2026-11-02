import { useState, useEffect, useCallback } from "react";
import {
  fetchKits,
  toggleKitStatus,
  softDeleteKitTransaction,
  renewKitValidity,
} from "../services/productKitsService";
import {
  KIT_VALIDITY_STATUS,
  getKitValidityStatus,
  validateKitDateRange,
} from "../services/kitValidityCalculationService";

/**
 * Lista de kits y acciones sobre filas (activar/desactivar, eliminar).
 * El formulario se inyecta solo a traves de lo que estas acciones necesitan.
 */
export const useKitListActions = ({
  editingKit,
  setEditingKit,
  resetForm,
  showAppAlert,
  showAppConfirm,
}) => {
  const [kits, setKits] = useState([]);
  const [deletingKit, setDeletingKit] = useState(null);

  // Recarga imperativa tras crear, editar o eliminar; el efecto de montaje llama
  // directo a `fetchKits` para no escribir estado de forma sincrona.
  const loadKits = useCallback(async () => {
    try {
      setKits(await fetchKits());
    } catch (error) {
      console.error("Error cargando kits:", error);
      setKits([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchKits()
      .then((data) => {
        if (cancelled) return;
        setKits(data);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Error cargando kits:", error);
        setKits([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const executeToggleKitStatus = async (kit, nextStatus) => {
    try {
      await toggleKitStatus(kit.id, nextStatus);
      await loadKits();
      if (editingKit?.id === kit.id)
        setEditingKit((prev) =>
          prev ? { ...prev, is_active: nextStatus } : prev
        );
      showAppAlert({
        type: "success",
        title: nextStatus ? "Kit activado" : "Kit desactivado",
        message: nextStatus ? "Kit activado." : "Kit desactivado.",
      });
    } catch (error) {
      console.error("Error actualizando kit:", error);
      showAppAlert({
        type: "danger",
        title: "Error al actualizar",
        message: "No se pudo actualizar el estatus del kit.",
      });
    }
  };

  const handleToggleKitStatus = async (kit) => {
    if (!kit?.id) return;
    const nextStatus = !kit.is_active;
    const outsideValidity =
      nextStatus &&
      [KIT_VALIDITY_STATUS.EXPIRED, KIT_VALIDITY_STATUS.SCHEDULED].includes(
        getKitValidityStatus({ ...kit, is_active: true })
      );
    const activateMessage = outsideValidity
      ? "Este kit está fuera de su vigencia, por lo que seguirá sin poder venderse aunque se active. Para venderlo, edita sus fechas de vigencia. ¿Deseas activarlo de todos modos?"
      : "¿Deseas activar este kit?";
    showAppConfirm({
      type: "warning",
      title: nextStatus ? "Activar kit" : "Desactivar kit",
      message: nextStatus ? activateMessage : "¿Deseas desactivar este kit?",
      confirmText: nextStatus ? "Sí, activar" : "Sí, desactivar",
      cancelText: "No, regresar",
      onConfirm: () => executeToggleKitStatus(kit, nextStatus),
    });
  };

  const executeSoftDeleteKit = async (kit) => {
    try {
      await softDeleteKitTransaction(kit.id, kit.kit_product_id);
      if (editingKit?.id === kit.id) resetForm();
      showAppAlert({
        type: "success",
        title: "Kit eliminado",
        message: "Kit eliminado del POS correctamente.",
      });
      await loadKits();
    } catch (error) {
      console.error("Error eliminando kit del POS:", error);
      showAppAlert({
        type: "danger",
        title: "Error al eliminar",
        message: "No se pudo eliminar el kit del POS.",
      });
    }
  };

  // El borrado se confirma en `KitDeleteConfirmModal`, que exige escribir ELIMINAR.
  const handleSoftDeleteKit = (kit) => {
    if (!kit?.id || !kit?.kit_product_id) return;
    setDeletingKit(kit);
  };

  const cancelSoftDeleteKit = () => setDeletingKit(null);

  const confirmSoftDeleteKit = async (kit) => {
    setDeletingKit(null);
    await executeSoftDeleteKit(kit);
  };

  const executeRenewKitValidity = async (kit, range) => {
    try {
      await renewKitValidity(kit.id, range);
      await loadKits();
      showAppAlert({
        type: "success",
        title: "Vigencia renovada",
        message: "Las fechas de vigencia del kit se actualizaron.",
      });
    } catch (error) {
      console.error("Error renovando vigencia del kit:", error);
      showAppAlert({
        type: "danger",
        title: "Error al renovar",
        message: "No se pudo renovar la vigencia del kit.",
      });
    }
  };

  const handleRenewKitValidity = (kit, { starts_on, ends_on }) => {
    if (!kit?.id) return;
    const rangeError = validateKitDateRange(starts_on, ends_on);
    if (rangeError) {
      showAppAlert({
        type: "danger",
        title: "Fechas no válidas",
        message: rangeError,
      });
      return;
    }
    showAppConfirm({
      type: "warning",
      title: "Renovar vigencia",
      message: `¿Deseas actualizar las fechas de vigencia del kit "${kit.products?.name || "KIT"}"?`,
      confirmText: "Sí, renovar",
      cancelText: "No, regresar",
      onConfirm: () => executeRenewKitValidity(kit, { starts_on, ends_on }),
    });
  };

  return {
    kits,
    loadKits,
    handleToggleKitStatus,
    handleSoftDeleteKit,
    deletingKit,
    confirmSoftDeleteKit,
    cancelSoftDeleteKit,
    handleRenewKitValidity,
  };
};
