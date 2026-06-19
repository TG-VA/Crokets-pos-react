import React, { useEffect, useMemo, useState } from "react";
import styles from "./RewardModal.module.css";
import { supabase } from "../../../../lib/supabaseClient";

const NAME_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 250;
const POINTS_MAX_VALUE = 999999;
const QUANTITY_MAX_VALUE = 999;
const FIXED_DISCOUNT_MAX_VALUE = 99999;

const emptyForm = {
  name: "",
  description: "",
  points_required: "",
  is_active: true,
  reward_type: "free_product",
  reward_quantity: "1",
  discount_type: "",
  discount_value: "",
};

const REWARD_TYPES = {
  free_product: "Producto gratis",
  product_discount: "Descuento en producto",
};

const DISCOUNT_TYPES = {
  percent: "Porcentaje",
  fixed: "Monto fijo",
};

const emptyConfirmationModal = {
  isOpen: false,
  title: "",
  message: "",
};

const RewardModal = ({ isOpen, onClose, onSaved, rewardToEdit }) => {
  const [formData, setFormData] = useState(emptyForm);
  const [products, setProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState("");

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [confirmationModal, setConfirmationModal] = useState(
    emptyConfirmationModal,
  );

  const isEditing = useMemo(() => !!rewardToEdit?.id, [rewardToEdit]);

  const requiresProducts = useMemo(() => {
    return formData.reward_type === "free_product";
  }, [formData.reward_type]);

  const requiresDiscount = useMemo(() => {
    return formData.reward_type === "product_discount";
  }, [formData.reward_type]);

  const normalizeRewardType = (type) => {
    if (type === "product_discount") return "product_discount";
    return "free_product";
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      setError("");

      const { data, error: productsError } = await supabase
        .from("products")
        .select(
          `
          id,
          barcode,
          name,
          sale_price
        `,
        )
        .order("name", { ascending: true });

      if (productsError) throw productsError;

      setProducts(data || []);
    } catch (err) {
      console.error("Error cargando productos:", err);
      setProducts([]);
      setError(
        err?.message || "No se pudieron cargar los productos del inventario.",
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadRewardProducts = async (rewardId) => {
    if (!rewardId) {
      setSelectedProductIds([]);
      return;
    }

    try {
      const { data, error: rewardProductsError } = await supabase
        .from("reward_products")
        .select("product_id")
        .eq("reward_id", rewardId);

      if (rewardProductsError) throw rewardProductsError;

      setSelectedProductIds((data || []).map((item) => item.product_id));
    } catch (err) {
      console.error("Error cargando productos de recompensa:", err);
      setSelectedProductIds([]);
      setError(
        err?.message || "No se pudieron cargar los productos vinculados.",
      );
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const initializeModal = async () => {
      setError("");
      setFieldErrors({});
      setTouchedFields({});
      setSaving(false);
      setProductSearchTerm("");
      setProducts([]);
      setConfirmationModal(emptyConfirmationModal);

      const normalizedRewardType = rewardToEdit
        ? normalizeRewardType(rewardToEdit.reward_type)
        : "free_product";

      if (rewardToEdit) {
        setFormData({
          name: String(rewardToEdit.name || "").slice(0, NAME_MAX_LENGTH),
          description: String(rewardToEdit.description || "").slice(
            0,
            DESCRIPTION_MAX_LENGTH,
          ),
          points_required: String(rewardToEdit.points_required || ""),
          is_active: rewardToEdit.is_active !== false,
          reward_type: normalizedRewardType,
          reward_quantity: String(rewardToEdit.reward_quantity || 1),
          discount_type:
            normalizedRewardType === "product_discount"
              ? rewardToEdit.discount_type || "percent"
              : "",
          discount_value:
            normalizedRewardType === "product_discount" &&
            rewardToEdit.discount_value !== null &&
            rewardToEdit.discount_value !== undefined
              ? String(rewardToEdit.discount_value)
              : "",
        });
      } else {
        setFormData(emptyForm);
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
  }, [isOpen, rewardToEdit]);

  const normalizeUpperText = (value, maxLength = null) => {
    const normalizedValue = String(value || "")
      .replace(/\s+/g, " ")
      .toUpperCase();

    if (maxLength) {
      return normalizedValue.slice(0, maxLength);
    }

    return normalizedValue;
  };

  const normalizePoints = (value) => {
    return String(value || "")
      .replace(/\D/g, "")
      .slice(0, 6);
  };

  const normalizeQuantity = (value) => {
    return String(value || "")
      .replace(/\D/g, "")
      .slice(0, 3);
  };

  const normalizeDiscountValue = (value) => {
    const cleanValue = String(value || "")
      .replace(/[^\d.]/g, "")
      .replace(/^0+(?=\d)/, "");

    const parts = cleanValue.split(".");

    if (parts.length > 1) {
      return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`.slice(0, 8);
    }

    return parts[0].slice(0, 8);
  };

  const validateValues = (values, selectedIds = selectedProductIds) => {
    const errors = {};

    const cleanName = String(values.name || "").trim();
    const cleanDescription = String(values.description || "").trim();
    const points = Number(values.points_required || 0);
    const rewardQuantity = Number(values.reward_quantity || 0);
    const discountValue = Number(values.discount_value || 0);

    if (!cleanName) {
      errors.name = "Ingresa el nombre de la recompensa.";
    } else if (cleanName.length < 3) {
      errors.name = "El nombre debe tener al menos 3 caracteres.";
    } else if (cleanName.length > NAME_MAX_LENGTH) {
      errors.name = `El nombre no puede superar ${NAME_MAX_LENGTH} caracteres.`;
    }

    if (cleanDescription.length > DESCRIPTION_MAX_LENGTH) {
      errors.description = `La descripción no puede superar ${DESCRIPTION_MAX_LENGTH} caracteres.`;
    }

    if (!String(values.points_required || "").trim()) {
      errors.points_required = "Ingresa los puntos requeridos.";
    } else if (!Number.isInteger(points) || points <= 0) {
      errors.points_required = "Los puntos deben ser mayores a 0.";
    } else if (points > POINTS_MAX_VALUE) {
      errors.points_required = `Los puntos no pueden superar ${POINTS_MAX_VALUE}.`;
    }

    if (!values.reward_type || !REWARD_TYPES[values.reward_type]) {
      errors.reward_type = "Selecciona un tipo de recompensa válido.";
    }

    if (!String(values.reward_quantity || "").trim()) {
      errors.reward_quantity = "Ingresa la cantidad permitida.";
    } else if (!Number.isInteger(rewardQuantity) || rewardQuantity <= 0) {
      errors.reward_quantity = "La cantidad debe ser mayor a 0.";
    } else if (rewardQuantity > QUANTITY_MAX_VALUE) {
      errors.reward_quantity = `La cantidad no puede superar ${QUANTITY_MAX_VALUE}.`;
    }

    if (values.reward_type === "free_product" && !selectedIds.length) {
      errors.products = "Selecciona al menos un producto aplicable.";
    }

    if (values.reward_type === "product_discount") {
      if (!values.discount_type || !DISCOUNT_TYPES[values.discount_type]) {
        errors.discount_type = "Selecciona el tipo de descuento.";
      }

      if (!String(values.discount_value || "").trim()) {
        errors.discount_value = "Ingresa el valor del descuento.";
      } else if (!discountValue || discountValue <= 0) {
        errors.discount_value = "El descuento debe ser mayor a 0.";
      } else if (
        values.discount_type === "percent" &&
        (discountValue <= 0 || discountValue > 100)
      ) {
        errors.discount_value = "El porcentaje debe estar entre 1 y 100.";
      } else if (
        values.discount_type === "fixed" &&
        discountValue > FIXED_DISCOUNT_MAX_VALUE
      ) {
        errors.discount_value = `El descuento fijo no puede superar $${FIXED_DISCOUNT_MAX_VALUE}.`;
      }
    }

    return errors;
  };

  const handleChange = (field, value) => {
    let finalValue = value;

    if (field === "name") {
      finalValue = normalizeUpperText(value, NAME_MAX_LENGTH);
    }

    if (field === "description") {
      finalValue = normalizeUpperText(value, DESCRIPTION_MAX_LENGTH);
    }

    if (field === "points_required") {
      finalValue = normalizePoints(value);
    }

    if (field === "reward_quantity") {
      finalValue = normalizeQuantity(value);
    }

    if (field === "discount_value") {
      finalValue = normalizeDiscountValue(value);
    }

    const nextFormData = {
      ...formData,
      [field]: finalValue,
    };

    setFormData(nextFormData);
    setFieldErrors(validateValues(nextFormData));

    if (error) {
      setError("");
    }
  };

  const handleRewardTypeChange = async (value) => {
    const nextRewardType = normalizeRewardType(value);

    const nextFormData = {
      ...formData,
      reward_type: nextRewardType,
      reward_quantity: formData.reward_quantity || "1",
      discount_type:
        nextRewardType === "product_discount"
          ? formData.discount_type || "percent"
          : "",
      discount_value:
        nextRewardType === "product_discount" ? formData.discount_value : "",
    };

    if (nextRewardType === "free_product") {
      await loadProducts();
    } else {
      setSelectedProductIds([]);
      setProducts([]);
      setProductSearchTerm("");
    }

    setFormData(nextFormData);
    setFieldErrors(validateValues(nextFormData));
    setError("");
  };

  const handleBlur = (field) => {
    setTouchedFields((prev) => ({
      ...prev,
      [field]: true,
    }));

    setFieldErrors(validateValues(formData));
  };

  const getFieldClassName = (field) => {
    const wasTouched = touchedFields[field];

    if (!wasTouched) return "";

    if (fieldErrors[field]) {
      return styles.inputInvalid;
    }

    const value = String(formData[field] ?? "").trim();

    if (value) {
      return styles.inputValid;
    }

    return "";
  };

  const checkDuplicateRewardName = async (name) => {
    let query = supabase
      .from("rewards")
      .select("id, name")
      .eq("name", name)
      .limit(1);

    if (isEditing && rewardToEdit?.id) {
      query = query.neq("id", rewardToEdit.id);
    }

    const { data, error: duplicateError } = await query;

    if (duplicateError) throw duplicateError;

    return data?.[0] || null;
  };

  const handleProductToggle = (productId) => {
    const nextSelectedProducts = selectedProductIds.includes(productId)
      ? selectedProductIds.filter((id) => id !== productId)
      : [...selectedProductIds, productId];

    setSelectedProductIds(nextSelectedProducts);
    setFieldErrors(validateValues(formData, nextSelectedProducts));

    if (error) {
      setError("");
    }
  };

  const selectedProducts = useMemo(() => {
    return products.filter((product) =>
      selectedProductIds.includes(product.id),
    );
  }, [products, selectedProductIds]);

  const filteredProducts = useMemo(() => {
    const search = productSearchTerm.trim().toLowerCase();

    if (search.length < 2) {
      return [];
    }

    return products.filter((product) => {
      if (selectedProductIds.includes(product.id)) return false;

      const values = [product.name, product.barcode, product.sale_price];

      return values.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search),
      );
    });
  }, [products, productSearchTerm, selectedProductIds]);

  const currentErrors = validateValues(formData);

  const canSave =
    String(formData.name || "").trim().length >= 3 &&
    Number(formData.points_required || 0) > 0 &&
    Object.keys(currentErrors).length === 0 &&
    !saving;

  const saveRewardProducts = async (rewardId, rewardType) => {
    const { data: currentRows, error: currentRowsError } = await supabase
      .from("reward_products")
      .select("product_id")
      .eq("reward_id", rewardId);

    if (currentRowsError) throw currentRowsError;

    const currentProductIds = (currentRows || []).map((row) => row.product_id);

    if (rewardType !== "free_product") {
      if (currentProductIds.length > 0) {
        const { error: deleteAllError } = await supabase
          .from("reward_products")
          .delete()
          .eq("reward_id", rewardId);

        if (deleteAllError) throw deleteAllError;
      }

      return;
    }

    const productIdsToInsert = selectedProductIds.filter(
      (productId) => !currentProductIds.includes(productId),
    );

    const productIdsToDelete = currentProductIds.filter(
      (productId) => !selectedProductIds.includes(productId),
    );

    if (productIdsToInsert.length > 0) {
      const rowsToInsert = productIdsToInsert.map((productId) => ({
        id: crypto.randomUUID(),
        reward_id: rewardId,
        product_id: productId,
        created_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from("reward_products")
        .insert(rowsToInsert);

      if (insertError) throw insertError;
    }

    if (productIdsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("reward_products")
        .delete()
        .eq("reward_id", rewardId)
        .in("product_id", productIdsToDelete);

      if (deleteError) throw deleteError;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedData = {
      name: normalizeUpperText(formData.name, NAME_MAX_LENGTH).trim(),
      description: normalizeUpperText(
        formData.description,
        DESCRIPTION_MAX_LENGTH,
      ).trim(),
      points_required: Number(formData.points_required || 0),
      is_active: formData.is_active,
      reward_type: normalizeRewardType(formData.reward_type),
      reward_quantity: Number(formData.reward_quantity || 1),
      discount_type: requiresDiscount ? formData.discount_type || null : null,
      discount_value: requiresDiscount
        ? Number(formData.discount_value || 0)
        : null,
    };

    const errors = validateValues(normalizedData);

    setFieldErrors(errors);
    setTouchedFields({
      name: true,
      description: true,
      points_required: true,
      reward_type: true,
      reward_quantity: true,
      discount_type: true,
      discount_value: true,
      products: true,
    });

    if (Object.keys(errors).length > 0) {
      setError("Corrige los campos marcados antes de guardar.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const duplicateReward = await checkDuplicateRewardName(
        normalizedData.name,
      );

      if (duplicateReward) {
        setError("Ya existe una recompensa con ese nombre.");
        return;
      }

      const payload = {
        name: normalizedData.name,
        description: normalizedData.description || null,
        points_required: normalizedData.points_required,
        is_active: normalizedData.is_active,
        reward_type: normalizedData.reward_type,
        reward_quantity: normalizedData.reward_quantity,
        discount_type: normalizedData.discount_type,
        discount_value: normalizedData.discount_value,
        updated_at: new Date().toISOString(),
      };

      let savedRewardId = rewardToEdit?.id || null;

      if (isEditing) {
        const { data, error: updateError } = await supabase
          .from("rewards")
          .update(payload)
          .eq("id", rewardToEdit.id)
          .select("id")
          .single();

        if (updateError) throw updateError;

        savedRewardId = data.id;
      } else {
        const rewardId = crypto.randomUUID();

        const { data, error: insertError } = await supabase
          .from("rewards")
          .insert([
            {
              id: rewardId,
              ...payload,
              created_at: new Date().toISOString(),
            },
          ])
          .select("id")
          .single();

        if (insertError) throw insertError;

        savedRewardId = data.id;
      }

      await saveRewardProducts(savedRewardId, normalizedData.reward_type);

      try {
        await onSaved?.();
      } catch (refreshError) {
        console.error(
          "Error actualizando listado de recompensas:",
          refreshError,
        );
      }

      setConfirmationModal({
        isOpen: true,
        title: isEditing
          ? "Recompensa editada correctamente"
          : "Recompensa creada correctamente",
        message: isEditing
          ? "Los cambios de la recompensa fueron guardados correctamente."
          : "La nueva recompensa fue registrada correctamente.",
      });
    } catch (err) {
      console.error("Error guardando recompensa:", err);

      const errorMessage = String(err?.message || "");

      if (errorMessage.includes("duplicate key")) {
        setError("Ya existe una recompensa con información duplicada.");
      } else {
        setError(err?.message || "No se pudo guardar la recompensa.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCloseConfirmationModal = () => {
    setConfirmationModal(emptyConfirmationModal);
    onClose();
  };

  useEffect(() => {
    if (!confirmationModal.isOpen) return;

    const handleEnterKey = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleCloseConfirmationModal();
      }
    };

    window.addEventListener("keydown", handleEnterKey);

    return () => {
      window.removeEventListener("keydown", handleEnterKey);
    };
  }, [confirmationModal.isOpen]);

  if (!isOpen) return null;

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{isEditing ? "Editar recompensa" : "Nueva recompensa"}</h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={saving}
          >
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.fieldGroup}>
            <label>Nombre de la recompensa *</label>
            <input
              type="text"
              maxLength={NAME_MAX_LENGTH}
              value={formData.name}
              onChange={(event) => handleChange("name", event.target.value)}
              onBlur={() => handleBlur("name")}
              disabled={saving}
              autoFocus
              className={getFieldClassName("name")}
            />

            {touchedFields.name && fieldErrors.name && (
              <span className={styles.fieldError}>{fieldErrors.name}</span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label>Puntos requeridos *</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={formData.points_required}
              onChange={(event) =>
                handleChange("points_required", event.target.value)
              }
              onBlur={() => handleBlur("points_required")}
              disabled={saving}
              className={getFieldClassName("points_required")}
            />

            {touchedFields.points_required && fieldErrors.points_required && (
              <span className={styles.fieldError}>
                {fieldErrors.points_required}
              </span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label>Tipo de recompensa *</label>
            <select
              value={formData.reward_type}
              onChange={(event) => handleRewardTypeChange(event.target.value)}
              onBlur={() => handleBlur("reward_type")}
              disabled={saving}
              className={getFieldClassName("reward_type")}
            >
              <option value="free_product">Producto gratis</option>
              <option value="product_discount">Descuento en producto</option>
            </select>

            {touchedFields.reward_type && fieldErrors.reward_type && (
              <span className={styles.fieldError}>
                {fieldErrors.reward_type}
              </span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label>
              {formData.reward_type === "free_product"
                ? "Cantidad gratis *"
                : "Cantidad de unidades aplicables *"}
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={3}
              value={formData.reward_quantity}
              onChange={(event) =>
                handleChange("reward_quantity", event.target.value)
              }
              onBlur={() => handleBlur("reward_quantity")}
              disabled={saving}
              className={getFieldClassName("reward_quantity")}
            />

            {touchedFields.reward_quantity && fieldErrors.reward_quantity && (
              <span className={styles.fieldError}>
                {fieldErrors.reward_quantity}
              </span>
            )}
          </div>

          {requiresDiscount && (
            <>
              <div className={styles.fieldGroup}>
                <label>Tipo de descuento *</label>
                <select
                  value={formData.discount_type}
                  onChange={(event) =>
                    handleChange("discount_type", event.target.value)
                  }
                  onBlur={() => handleBlur("discount_type")}
                  disabled={saving}
                  className={getFieldClassName("discount_type")}
                >
                  <option value="">Selecciona tipo de descuento</option>
                  <option value="percent">Porcentaje</option>
                  <option value="fixed">Monto fijo</option>
                </select>

                {touchedFields.discount_type && fieldErrors.discount_type && (
                  <span className={styles.fieldError}>
                    {fieldErrors.discount_type}
                  </span>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <label>
                  {formData.discount_type === "percent"
                    ? "Porcentaje de descuento *"
                    : "Monto de descuento *"}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  maxLength={8}
                  value={formData.discount_value}
                  onChange={(event) =>
                    handleChange("discount_value", event.target.value)
                  }
                  onBlur={() => handleBlur("discount_value")}
                  disabled={saving}
                  placeholder={
                    formData.discount_type === "percent" ? "50" : "100"
                  }
                  className={getFieldClassName("discount_value")}
                />

                {touchedFields.discount_value && fieldErrors.discount_value && (
                  <span className={styles.fieldError}>
                    {fieldErrors.discount_value}
                  </span>
                )}
              </div>
            </>
          )}

          {requiresProducts && (
            <div className={`${styles.fieldGroup} ${styles.productSearchBox}`}>
              <label>Productos aplicables *</label>

              <input
                type="text"
                value={productSearchTerm}
                onChange={(event) => setProductSearchTerm(event.target.value)}
                disabled={saving || loadingProducts}
                placeholder="Buscar producto por nombre o código..."
              />

              {loadingProducts && (
                <span className={styles.productHelpText}>
                  Cargando productos...
                </span>
              )}

              {!loadingProducts &&
                productSearchTerm.trim().length > 0 &&
                productSearchTerm.trim().length < 2 && (
                  <span className={styles.productHelpText}>
                    Escribe al menos 2 caracteres para buscar productos.
                  </span>
                )}

              {!loadingProducts &&
                productSearchTerm.trim().length >= 2 &&
                filteredProducts.length === 0 && (
                  <span className={styles.productHelpText}>
                    No hay productos con esa búsqueda.
                  </span>
                )}

              {!loadingProducts && filteredProducts.length > 0 && (
                <div className={styles.productResultsBox}>
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className={styles.productResultButton}
                      onClick={() => handleProductToggle(product.id)}
                      disabled={saving}
                    >
                      <span>
                        <strong className={styles.productResultName}>
                          {product.name || "SIN NOMBRE"}
                        </strong>

                        {product.barcode && (
                          <small className={styles.productBarcode}>
                            ({product.barcode})
                          </small>
                        )}
                      </span>

                      <strong className={styles.productPrice}>
                        ${Number(product.sale_price || 0).toFixed(2)}
                      </strong>
                    </button>
                  ))}
                </div>
              )}

              <div className={styles.selectedProductsBox}>
                <div className={styles.selectedProductsTitle}>
                  <span>Productos seleccionados</span>
                  <strong>{selectedProductIds.length}</strong>
                </div>

                {selectedProducts.length === 0 ? (
                  <p className={styles.emptySelectedText}>
                    Aún no has seleccionado productos para esta recompensa.
                  </p>
                ) : (
                  <div className={styles.selectedProductsList}>
                    {selectedProducts.map((product) => (
                      <div
                        key={product.id}
                        className={styles.selectedProductItem}
                      >
                        <span>
                          <strong className={styles.selectedProductName}>
                            {product.name || "SIN NOMBRE"}
                          </strong>

                          {product.barcode && (
                            <small className={styles.productBarcode}>
                              ({product.barcode})
                            </small>
                          )}
                        </span>

                        <button
                          type="button"
                          className={styles.removeProductButton}
                          onClick={() => handleProductToggle(product.id)}
                          disabled={saving}
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {fieldErrors.products && (
                <span className={styles.fieldError}>
                  {fieldErrors.products}
                </span>
              )}
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label>Descripción</label>
            <textarea
              maxLength={DESCRIPTION_MAX_LENGTH}
              value={formData.description}
              onChange={(event) =>
                handleChange("description", event.target.value)
              }
              onBlur={() => handleBlur("description")}
              disabled={saving}
              rows={4}
            />

            <span
              style={{
                color: "#666666",
                fontSize: "12px",
                fontWeight: 700,
                textAlign: "right",
              }}
            >
              {String(formData.description || "").length}/
              {DESCRIPTION_MAX_LENGTH}
            </span>

            {touchedFields.description && fieldErrors.description && (
              <span className={styles.fieldError}>
                {fieldErrors.description}
              </span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label>Estado</label>
            <select
              value={formData.is_active ? "active" : "inactive"}
              onChange={(event) =>
                handleChange("is_active", event.target.value === "active")
              }
              disabled={saving}
            >
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
            </select>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className={styles.saveButton}
              disabled={!canSave}
              title={
                !canSave && !saving ? "Completa los campos correctamente." : ""
              }
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>

      {confirmationModal.isOpen && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmModal}>
            <div className={styles.confirmIcon}>✓</div>

            <h3>{confirmationModal.title}</h3>

            <p>{confirmationModal.message}</p>

            <button
              type="button"
              className={styles.confirmButton}
              onClick={handleCloseConfirmationModal}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardModal;
