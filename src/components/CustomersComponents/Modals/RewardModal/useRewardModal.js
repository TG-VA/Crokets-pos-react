import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EMPTY_REWARD_FORM,
  REWARD_TOUCHED_FIELDS,
  buildNormalizedRewardData,
  buildRewardFormValues,
  buildRewardPayload,
  buildRewardTypeChange,
  canSubmitReward,
  getFilteredRewardProducts,
  getSelectedRewardProducts,
  normalizeRewardFieldValue,
  normalizeRewardType,
  toggleRewardProductId,
  validateRewardValues,
} from "./rewardModalCalculationService";
import {
  fetchRewardProductIds,
  fetchRewardProductsCatalog,
  findRewardByName,
  persistReward,
  syncRewardProducts,
} from "./rewardModalService";

const DEFAULT_APP_MODAL = {
  isOpen: false,
  type: "info",
  title: "",
  message: "",
  confirmText: "Entendido",
  cancelText: "Cancelar",
  showCancel: false,
  loading: false,
  onConfirm: null,
  onCancel: null,
};

export const useRewardModal = ({ isOpen, onClose, onSaved, rewardToEdit }) => {
  const [formData, setFormData] = useState(EMPTY_REWARD_FORM);
  const [products, setProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState("");

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  const [appModal, setAppModal] = useState(DEFAULT_APP_MODAL);

  const closeAppModal = useCallback(() => {
    setAppModal((prev) => ({
      ...prev,
      isOpen: false,
      loading: false,
      onConfirm: null,
      onCancel: null,
    }));
  }, []);

  const showAppAlert = useCallback(
    ({
      type = "info",
      title = "Aviso",
      message = "",
      confirmText = "Entendido",
      onConfirm = null,
    } = {}) => {
      setAppModal({
        isOpen: true,
        type,
        title,
        message,
        confirmText,
        cancelText: "Cancelar",
        showCancel: false,
        loading: false,
        onConfirm: onConfirm || closeAppModal,
        onCancel: closeAppModal,
      });
    },
    [closeAppModal]
  );

  const isEditing = useMemo(() => !!rewardToEdit?.id, [rewardToEdit]);

  const requiresProducts = formData.reward_type === "free_product";
  const requiresDiscount = formData.reward_type === "product_discount";

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);

      const catalog = await fetchRewardProductsCatalog();
      setProducts(catalog);
    } catch (err) {
      console.error("Error cargando productos:", err);
      setProducts([]);

      showAppAlert({
        type: "danger",
        title: "No se pudieron cargar productos",
        message:
          err?.message || "No se pudieron cargar los productos del inventario.",
      });
    } finally {
      setLoadingProducts(false);
    }
  }, [showAppAlert]);

  const loadRewardProducts = useCallback(
    async (rewardId) => {
      if (!rewardId) {
        setSelectedProductIds([]);
        return;
      }

      try {
        const productIds = await fetchRewardProductIds(rewardId);
        setSelectedProductIds(productIds);
      } catch (err) {
        console.error("Error cargando productos de recompensa:", err);
        setSelectedProductIds([]);

        showAppAlert({
          type: "danger",
          title: "No se pudieron cargar productos",
          message:
            err?.message || "No se pudieron cargar los productos vinculados.",
        });
      }
    },
    [showAppAlert]
  );

  const handleRequestClose = useCallback(() => {
    if (saving || appModal.isOpen) return;
    onClose?.();
  }, [saving, appModal.isOpen, onClose]);

  const handleChange = (field, value) => {
    const finalValue = normalizeRewardFieldValue(field, value);

    const nextFormData = {
      ...formData,
      [field]: finalValue,
    };

    setFormData(nextFormData);
    setFieldErrors(validateRewardValues(nextFormData, selectedProductIds));
  };

  const handleRewardTypeChange = async (value) => {
    const { needsProducts, values } = buildRewardTypeChange(formData, value);

    if (needsProducts) {
      await loadProducts();
    } else {
      setSelectedProductIds([]);
      setProducts([]);
      setProductSearchTerm("");
    }

    setFormData(values);
    setFieldErrors(validateRewardValues(values, selectedProductIds));
  };

  const handleBlur = (field) => {
    setTouchedFields((prev) => ({
      ...prev,
      [field]: true,
    }));

    setFieldErrors(validateRewardValues(formData, selectedProductIds));
  };

  const handleProductToggle = (productId) => {
    const nextSelectedProducts = toggleRewardProductId(
      selectedProductIds,
      productId
    );

    setSelectedProductIds(nextSelectedProducts);
    setFieldErrors(validateRewardValues(formData, nextSelectedProducts));
  };

  const selectedProducts = useMemo(
    () => getSelectedRewardProducts(products, selectedProductIds),
    [products, selectedProductIds]
  );

  const filteredProducts = useMemo(
    () =>
      getFilteredRewardProducts({
        products,
        searchTerm: productSearchTerm,
        selectedProductIds,
      }),
    [products, productSearchTerm, selectedProductIds]
  );

  const currentErrors = useMemo(
    () => validateRewardValues(formData, selectedProductIds),
    [formData, selectedProductIds]
  );

  const canSave = canSubmitReward({
    formData,
    errors: currentErrors,
    saving,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedData = buildNormalizedRewardData(
      formData,
      requiresDiscount
    );

    const errors = validateRewardValues(normalizedData, selectedProductIds);

    setFieldErrors(errors);
    setTouchedFields({ ...REWARD_TOUCHED_FIELDS });

    if (Object.keys(errors).length > 0) {
      showAppAlert({
        type: "warning",
        title: "Campos incompletos",
        message: "Corrige los campos marcados antes de guardar.",
        confirmText: "Entendido",
      });
      return;
    }

    try {
      setSaving(true);

      const duplicateReward = await findRewardByName(
        normalizedData.name,
        isEditing ? rewardToEdit?.id : null
      );

      if (duplicateReward) {
        showAppAlert({
          type: "warning",
          title: "Recompensa duplicada",
          message: "Ya existe una recompensa con ese nombre.",
          confirmText: "Entendido",
        });
        return;
      }

      const payload = buildRewardPayload(normalizedData);

      const savedRewardId = await persistReward({ rewardToEdit, payload });

      await syncRewardProducts({
        rewardId: savedRewardId,
        rewardType: normalizedData.reward_type,
        selectedProductIds,
      });

      try {
        await onSaved?.();
      } catch (refreshError) {
        console.error(
          "Error actualizando listado de recompensas:",
          refreshError
        );
      }

      showAppAlert({
        type: "success",
        title: isEditing ? "Recompensa editada" : "Recompensa creada",
        message: isEditing
          ? "Los cambios de la recompensa fueron guardados correctamente."
          : "La nueva recompensa fue registrada correctamente.",
        confirmText: "Aceptar",
        onConfirm: () => {
          closeAppModal();
          onClose?.();
        },
      });
    } catch (err) {
      console.error("Error guardando recompensa:", err);

      const errorMessage = String(err?.message || "");

      showAppAlert({
        type: "danger",
        title: "No se pudo guardar",
        message: errorMessage.includes("duplicate key")
          ? "Ya existe una recompensa con información duplicada."
          : err?.message || "No se pudo guardar la recompensa.",
        confirmText: "Entendido",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const initializeModal = async () => {
      setFieldErrors({});
      setTouchedFields({});
      setSaving(false);
      setProductSearchTerm("");
      setProducts([]);
      closeAppModal();

      const normalizedRewardType = rewardToEdit
        ? normalizeRewardType(rewardToEdit.reward_type)
        : "free_product";

      if (rewardToEdit) {
        setFormData(buildRewardFormValues(rewardToEdit));
      } else {
        setFormData({ ...EMPTY_REWARD_FORM });
        setSelectedProductIds([]);
      }

      if (normalizedRewardType === "free_product") {
        await loadProducts();

        if (rewardToEdit?.id) {
          await loadRewardProducts(rewardToEdit.id);
        }
      } else {
        setSelectedProductIds([]);
      }
    };

    initializeModal();
  }, [isOpen, rewardToEdit, loadProducts, loadRewardProducts, closeAppModal]);

  return {
    formData,
    products,
    selectedProductIds,
    selectedProducts,
    filteredProducts,
    productSearchTerm,
    setProductSearchTerm,
    loadingProducts,
    saving,
    fieldErrors,
    touchedFields,
    appModal,
    isEditing,
    requiresProducts,
    requiresDiscount,
    canSave,
    handleChange,
    handleRewardTypeChange,
    handleBlur,
    handleProductToggle,
    handleRequestClose,
    handleSubmit,
    closeAppModal,
    showAppAlert,
  };
};
