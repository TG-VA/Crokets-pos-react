import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ProductsPromotions.module.css";
import { supabase } from "../../../../lib/supabaseClient";

const ProductsPromotions = () => {
  const [form, setForm] = useState({
    barcode: "",
    description: "",
    price: "",
  });

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [kits, setKits] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [editingKit, setEditingKit] = useState(null);

  const barcodeInputRef = useRef(null);

  const selectedProductsTotal = useMemo(() => {
    return selectedProducts.reduce((sum, product) => {
      return (
        sum +
        Number(product.sale_price || 0) * Number(product.quantity || 0)
      );
    }, 0);
  }, [selectedProducts]);

  const kitPrice = Number(form.price || 0);

  const kitDiscount = useMemo(() => {
    if (selectedProductsTotal <= 0 || kitPrice <= 0) return 0;
    return selectedProductsTotal - kitPrice;
  }, [selectedProductsTotal, kitPrice]);

  const kitDiscountPercent = useMemo(() => {
    if (selectedProductsTotal <= 0 || kitDiscount <= 0) return 0;
    return (kitDiscount / selectedProductsTotal) * 100;
  }, [selectedProductsTotal, kitDiscount]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm({
      barcode: "",
      description: "",
      price: "",
    });

    setSelectedProducts([]);
    setSelectedProductId(null);
    setEditingKit(null);

    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 0);
  };

  const handleClearForm = () => {
    const hasData =
      form.barcode.trim() ||
      form.description.trim() ||
      String(form.price).trim() ||
      selectedProducts.length > 0 ||
      editingKit;

    if (!hasData) {
      resetForm();
      return;
    }

    const confirmClear = window.confirm(
      editingKit
        ? "¿Deseas cancelar la edición y limpiar el formulario?"
        : "¿Deseas limpiar el formulario del kit?"
    );

    if (!confirmClear) return;

    resetForm();
  };

const loadKits = async () => {
  try {
    const { data, error } = await supabase
      .from("product_kits")
      .select(`
        id,
        kit_product_id,
        is_active,
        created_at,
        updated_at,
        products:product_kits_kit_product_id_fkey (
          id,
          barcode,
          name,
          sale_price,
          status,
          is_global
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    console.log("Kits data:", JSON.stringify(data, null, 2)); // ← agrega esto

    const visibleKits = (data || []).filter(
      (kit) => kit.products?.status === true
    );

    setKits(visibleKits);
  } catch (error) {
    console.error("Error cargando kits:", error);
    setKits([]);
  }
};
  useEffect(() => {
    loadKits();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F10") {
        e.preventDefault();
        setShowSearchModal(true);
      }

      if (e.key === "Escape" && editingKit && !showSearchModal) {
        e.preventDefault();
        resetForm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editingKit, showSearchModal]);

  const addProductToKit = (product) => {
    if (!product?.id) return;

    if (product.is_kit) {
      alert("No puedes agregar un kit dentro de otro kit.");
      return;
    }

    const alreadyExists = selectedProducts.some((p) => p.id === product.id);

    if (alreadyExists) {
      alert("Este producto ya está agregado al kit.");
      return;
    }

    setSelectedProducts((prev) => [
      ...prev,
      {
        id: product.id,
        barcode: product.barcode || "",
        name: product.name || "Producto",
        sale_price: Number(product.sale_price || 0),
        cost_price: Number(product.cost_price || 0),
        quantity: 1,
      },
    ]);

    setSelectedProductId(product.id);
  };

  const updateProductQuantity = (productId, value) => {
    const quantity = Number(value);

    setSelectedProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? {
              ...product,
              quantity:
                Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
            }
          : product
      )
    );
  };

  const removeSelectedProduct = () => {
    if (!selectedProductId) {
      alert("Selecciona un producto del kit para removerlo.");
      return;
    }

    setSelectedProducts((prev) =>
      prev.filter((product) => product.id !== selectedProductId)
    );

    setSelectedProductId(null);
  };

  const validateForm = () => {
    const barcode = form.barcode.trim();
    const description = form.description.trim();
    const price = Number(form.price);

    if (!barcode) {
      alert("Captura el código de barras del kit.");
      return false;
    }

    if (!description) {
      alert("Captura la descripción del kit.");
      return false;
    }

    if (!Number.isFinite(price) || price <= 0) {
      alert("Captura un precio válido para el kit.");
      return false;
    }

    if (selectedProducts.length === 0) {
      alert("Agrega al menos un producto al kit.");
      return false;
    }

    const invalidQuantity = selectedProducts.some(
      (product) =>
        !Number.isFinite(Number(product.quantity)) ||
        Number(product.quantity) <= 0
    );

    if (invalidQuantity) {
      alert("Todos los productos del kit deben tener una cantidad mayor a 0.");
      return false;
    }

    return true;
  };

  const validateDuplicatedKit = async ({
    cleanBarcode,
    cleanDescription,
    currentProductId = null,
  }) => {
    const { data: duplicatedBarcode, error: barcodeError } = await supabase
      .from("products")
      .select("id")
      .eq("barcode", cleanBarcode)
      .maybeSingle();

    if (barcodeError) throw barcodeError;

    if (duplicatedBarcode && duplicatedBarcode.id !== currentProductId) {
      alert("Ya existe un producto o kit con ese código de barras.");
      return false;
    }

    const { data: duplicatedName, error: nameError } = await supabase
      .from("products")
      .select("id")
      .eq("name", cleanDescription)
      .eq("is_kit", true)
      .maybeSingle();

    if (nameError) throw nameError;

    if (duplicatedName && duplicatedName.id !== currentProductId) {
      alert(
        "Ya existe un kit con ese nombre. Aunque esté eliminado del POS, no se puede repetir."
      );
      return false;
    }

    return true;
  };

  const handleCreateKit = async () => {
    const cleanBarcode = form.barcode.trim();
    const cleanDescription = form.description.trim().toUpperCase();
    const kitPriceValue = Number(form.price);
    const now = new Date().toISOString();

    const isValidDuplicate = await validateDuplicatedKit({
      cleanBarcode,
      cleanDescription,
    });

    if (!isValidDuplicate) return;

    const { data: kitProduct, error: productError } = await supabase
      .from("products")
      .insert({
        barcode: cleanBarcode,
        name: cleanDescription,
        sale_type: "unidad",
        department_id: null,
        unit: "pieza",
        cost_price: 0,
        sale_price: kitPriceValue,
        tax: 16,
        commission_enabled: false,
        commission_percent: 0,
        clave_sat: null,
        status: true,
        is_global: true,
        is_kit: true,
        tracks_inventory: false,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (productError) throw productError;

    const { data: kitRow, error: kitError } = await supabase
      .from("product_kits")
      .insert({
        kit_product_id: kitProduct.id,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (kitError) throw kitError;

    const kitItemsPayload = selectedProducts.map((product) => ({
      kit_id: kitRow.id,
      component_product_id: product.id,
      quantity: Number(product.quantity),
      created_at: now,
    }));

    const { error: itemsError } = await supabase
      .from("product_kit_items")
      .insert(kitItemsPayload);

    if (itemsError) throw itemsError;

    alert("Kit guardado correctamente.");
  };

  const handleUpdateKit = async () => {
    if (!editingKit?.id || !editingKit?.kit_product_id) {
      alert("No se detectó el kit que se está editando.");
      return;
    }

    const cleanBarcode = form.barcode.trim();
    const cleanDescription = form.description.trim().toUpperCase();
    const kitPriceValue = Number(form.price);
    const now = new Date().toISOString();

    const isValidDuplicate = await validateDuplicatedKit({
      cleanBarcode,
      cleanDescription,
      currentProductId: editingKit.kit_product_id,
    });

    if (!isValidDuplicate) return;

    const { error: productError } = await supabase
      .from("products")
      .update({
        barcode: cleanBarcode,
        name: cleanDescription,
        sale_price: kitPriceValue,
        updated_at: now,
      })
      .eq("id", editingKit.kit_product_id);

    if (productError) throw productError;

    const { error: kitError } = await supabase
      .from("product_kits")
      .update({
        updated_at: now,
      })
      .eq("id", editingKit.id);

    if (kitError) throw kitError;

    const { error: deleteItemsError } = await supabase
      .from("product_kit_items")
      .delete()
      .eq("kit_id", editingKit.id);

    if (deleteItemsError) throw deleteItemsError;

    const kitItemsPayload = selectedProducts.map((product) => ({
      kit_id: editingKit.id,
      component_product_id: product.id,
      quantity: Number(product.quantity),
      created_at: now,
    }));

    const { error: itemsError } = await supabase
      .from("product_kit_items")
      .insert(kitItemsPayload);

    if (itemsError) throw itemsError;

    alert("Kit actualizado correctamente.");
  };

  const handleSaveKit = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      if (editingKit) {
        await handleUpdateKit();
      } else {
        await handleCreateKit();
      }

      resetForm();
      await loadKits();
    } catch (error) {
      console.error("Error guardando kit:", error);
      alert(error.message || "Error al guardar el kit.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditKit = async (kit) => {
    if (!kit?.id || !kit?.kit_product_id) return;

    try {
      const { data: items, error } = await supabase
        .from("product_kit_items")
        .select(`
          id,
          kit_id,
          component_product_id,
          quantity,
          products:component_product_id (
            id,
            barcode,
            name,
            sale_price,
            cost_price,
            is_kit
          )
        `)
        .eq("kit_id", kit.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setEditingKit(kit);

      setForm({
        barcode: kit.products?.barcode || "",
        description: kit.products?.name || "",
        price: String(Number(kit.products?.sale_price || 0)),
      });

      setSelectedProducts(
        (items || [])
          .filter((item) => item.products)
          .map((item) => ({
            id: item.products.id,
            barcode: item.products.barcode || "",
            name: item.products.name || "Producto",
            sale_price: Number(item.products.sale_price || 0),
            cost_price: Number(item.products.cost_price || 0),
            quantity: Number(item.quantity || 1),
          }))
      );

      setSelectedProductId(null);

      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 0);
    } catch (error) {
      console.error("Error cargando kit para editar:", error);
      alert(error.message || "No se pudo cargar el kit para editar.");
    }
  };

  const handleToggleKitStatus = async (kit) => {
    if (!kit?.id) return;

    const nextStatus = !kit.is_active;

    const confirmMessage = nextStatus
      ? "¿Deseas activar este kit?"
      : "¿Deseas desactivar este kit?";

    if (!window.confirm(confirmMessage)) return;

    try {
      const now = new Date().toISOString();

      const { error: kitError } = await supabase
        .from("product_kits")
        .update({
          is_active: nextStatus,
          updated_at: now,
        })
        .eq("id", kit.id);

      if (kitError) throw kitError;

      await loadKits();

      if (editingKit?.id === kit.id) {
        setEditingKit((prev) =>
          prev ? { ...prev, is_active: nextStatus } : prev
        );
      }

      alert(nextStatus ? "Kit activado." : "Kit desactivado.");
    } catch (error) {
      console.error("Error actualizando kit:", error);
      alert(error.message || "No se pudo actualizar el kit.");
    }
  };

  const handleSoftDeleteKit = async (kit) => {
    if (!kit?.id || !kit?.kit_product_id) return;

    const confirmDelete = window.confirm(
      `¿Deseas eliminar del POS el kit "${
        kit.products?.name || "KIT"
      }"?\n\nEl registro se conservará en la base de datos.`
    );

    if (!confirmDelete) return;

    try {
      const now = new Date().toISOString();

      const { error: kitError } = await supabase
        .from("product_kits")
        .update({
          is_active: false,
          updated_at: now,
        })
        .eq("id", kit.id);

      if (kitError) throw kitError;

      const { error: productError } = await supabase
        .from("products")
        .update({
          status: false,
          updated_at: now,
        })
        .eq("id", kit.kit_product_id);

      if (productError) throw productError;

      if (editingKit?.id === kit.id) {
        resetForm();
      }

      alert("Kit eliminado del POS correctamente.");
      await loadKits();
    } catch (error) {
      console.error("Error eliminando kit del POS:", error);
      alert(error.message || "No se pudo eliminar el kit del POS.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {editingKit ? "Editar Kit" : "Promociones (Kits)"}
          </h1>
        </div>

        <div className={styles.card}>
          <div className={styles.topSection}>
            <div className={styles.formColumn}>
              <div className={styles.formRow}>
                <label className={styles.label}>Código de Barras</label>
                <input
                  ref={barcodeInputRef}
                  className={styles.input}
                  type="text"
                  placeholder="Código de barras del kit"
                  value={form.barcode}
                  onChange={(e) => updateField("barcode", e.target.value)}
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.label}>Descripción</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Descripción del kit"
                  value={form.description}
                  onChange={(e) =>
                    updateField("description", e.target.value.toUpperCase())
                  }
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.label}>Precio kit</label>
                <input
                  className={styles.input}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.label}>Precio real</label>
                <div className={styles.summaryBox}>
                  <strong>${selectedProductsTotal.toFixed(2)}</strong>

                  {selectedProductsTotal > 0 && kitPrice > 0 && (
                    <span>
                      Ahorro: ${Math.max(kitDiscount, 0).toFixed(2)} /{" "}
                      {Math.max(kitDiscountPercent, 0).toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.formRow}>
                <label className={styles.label}>Agregar producto</label>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSave}`}
                  onClick={() => setShowSearchModal(true)}
                >
                  F10 - Buscar producto
                </button>
              </div>
            </div>

            <div className={styles.listColumn}>
              <div className={styles.columnHeader}>Productos del kit</div>

              <div className={styles.listArea}>
                {selectedProducts.length === 0 ? (
                  <div className={styles.emptyState}>
                    No hay productos seleccionados
                  </div>
                ) : (
                  <div className={styles.selectedList}>
                    {selectedProducts.map((product) => {
                      const productTotal =
                        Number(product.sale_price || 0) *
                        Number(product.quantity || 0);

                      return (
                        <div
                          key={product.id}
                          className={`${styles.productItem} ${
                            selectedProductId === product.id
                              ? styles.selectedProductItem
                              : ""
                          }`}
                          onClick={() => setSelectedProductId(product.id)}
                        >
                          <div>
                            <strong>{product.name}</strong>
                            <div className={styles.productMeta}>
                              Código: {product.barcode || "Sin código"} ·
                              Precio: $
                              {Number(product.sale_price || 0).toFixed(2)} ·
                              Total: ${productTotal.toFixed(2)}
                            </div>
                          </div>

                          <input
                            className={styles.productQty}
                            type="number"
                            min="1"
                            step="1"
                            value={product.quantity}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              updateProductQuantity(product.id, e.target.value)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.actionsSection}>
            <div className={styles.leftButtons}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSave}`}
                onClick={handleSaveKit}
                disabled={saving}
              >
                {saving
                  ? "Guardando..."
                  : editingKit
                  ? "Actualizar kit"
                  : "Guardar kit"}
              </button>

              <button
                type="button"
                className={`${styles.btn} ${styles.btnDelete}`}
                onClick={handleClearForm}
                disabled={saving}
              >
                Limpiar
              </button>
            </div>

            <div className={styles.rightButtons}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnRemove}`}
                onClick={removeSelectedProduct}
                disabled={!selectedProductId}
              >
                Remover seleccionado
              </button>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>Kits registrados</div>

          <div className={styles.cardContent}>
            {kits.length === 0 ? (
              <div className={styles.emptyState}>No hay kits registrados</div>
            ) : (
              <div className={styles.kitsList}>
                {kits.map((kit) => (
                  <div
                    key={kit.id}
                    className={`${styles.kitRow} ${
                      editingKit?.id === kit.id ? styles.selectedProductItem : ""
                    }`}
                  >
                    <div>
                      <strong>{kit.products?.name || "KIT"}</strong>
                      <div className={styles.productMeta}>
                        Código: {kit.products?.barcode || "Sin código"} ·
                        Precio: $
                        {Number(kit.products?.sale_price || 0).toFixed(2)}
                      </div>
                    </div>

                    <span
                      className={`${styles.kitStatus} ${
                        kit.is_active
                          ? styles.kitStatusActive
                          : styles.kitStatusInactive
                      }`}
                    >
                      {kit.is_active ? "Activo" : "Inactivo"}
                    </span>

                    <div className={styles.kitActions}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSave}`}
                        onClick={() => handleEditKit(kit)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className={`${styles.btn} ${
                          kit.is_active ? styles.btnDelete : styles.btnSave
                        }`}
                        onClick={() => handleToggleKitStatus(kit)}
                      >
                        {kit.is_active ? "Desactivar" : "Activar"}
                      </button>

                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnRemove}`}
                        onClick={() => handleSoftDeleteKit(kit)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <KitProductSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectProduct={addProductToKit}
      />
    </div>
  );
};

const KitProductSearchModal = ({ isOpen, onClose, onSelectProduct }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef(null);
  const resultsListRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    setSearchTerm("");
    setResults([]);
    setSelectedIndex(-1);
    setLoading(false);

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!resultsListRef.current) return;
    if (selectedIndex < 0) return;

    const selectedItem = resultsListRef.current.querySelector(
      `[data-product-index="${selectedIndex}"]`
    );

    if (selectedItem) {
      selectedItem.scrollIntoView({
        block: "nearest",
        behavior: "auto",
      });
    }
  }, [selectedIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        if (results.length === 0) return;
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (e.key === "ArrowUp") {
        if (results.length === 0) return;
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }

      if (e.key === "Enter") {
        if (selectedIndex < 0 || !results[selectedIndex]) return;
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, results, selectedIndex]);

  const normalizeText = (text) =>
    String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const searchProducts = async (value) => {
    const cleanValue = value.trim();

    if (!cleanValue) {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          barcode,
          name,
          cost_price,
          sale_price,
          status,
          is_kit,
          tracks_inventory
        `)
        .eq("status", true)
        .eq("is_kit", false)
        .order("name", { ascending: true });

      if (error) throw error;

      const normalized = normalizeText(cleanValue);

      const filtered = (data || []).filter((product) => {
        const searchable = normalizeText(
          `${product.name || ""} ${product.barcode || ""}`
        );

        return searchable.includes(normalized);
      });

      setResults(filtered);
      setSelectedIndex(filtered.length > 0 ? 0 : -1);
    } catch (error) {
      console.error("Error buscando productos:", error);
      setResults([]);
      setSelectedIndex(-1);
      alert("No se pudieron buscar productos.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (product) => {
    if (!product) return;

    onSelectProduct(product);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.searchOverlay} onClick={onClose}>
      <div className={styles.searchModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchHeader}>
          <h2>Búsqueda de productos</h2>

          <button
            type="button"
            className={styles.searchCloseButton}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className={styles.searchBody}>
          <label className={styles.searchLabel}>
            Nombre o código del producto:
          </label>

          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              searchProducts(e.target.value);
            }}
            placeholder="Escribe para buscar..."
          />

          <div className={styles.searchHint}>
            ↑↓ Navegar · Enter seleccionar · ESC cerrar
          </div>

          <div ref={resultsListRef} className={styles.searchResults}>
            {loading ? (
              <div className={styles.searchEmpty}>Buscando productos...</div>
            ) : results.length === 0 ? (
              <div className={styles.searchEmpty}>
                {searchTerm.trim()
                  ? "No se encontraron productos."
                  : "Ingresa nombre o código del producto."}
              </div>
            ) : (
              results.map((product, index) => (
                <div
                  key={product.id}
                  data-product-index={index}
                  className={`${styles.searchResultItem} ${
                    index === selectedIndex ? styles.searchResultSelected : ""
                  }`}
                  onClick={() => setSelectedIndex(index)}
                  onDoubleClick={() => handleSelect(product)}
                >
                  <strong>{product.name}</strong>

                  <div className={styles.searchResultMeta}>
                    Código: {product.barcode || "Sin código"} · Precio: $
                    {Number(product.sale_price || 0).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.searchFooter}>
          <button
            type="button"
            className={`${styles.searchActionButton} ${styles.searchSelectButton}`}
            onClick={() => {
              if (selectedIndex >= 0 && results[selectedIndex]) {
                handleSelect(results[selectedIndex]);
              }
            }}
            disabled={selectedIndex < 0}
          >
            Seleccionar
          </button>

          <button
            type="button"
            className={`${styles.searchActionButton} ${styles.searchCancelButton}`}
            onClick={onClose}
          >
            ESC - Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductsPromotions;