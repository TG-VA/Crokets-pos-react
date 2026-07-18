import React, {
  useMemo,
  useState,
} from "react";

import AppModal from "../../../AppModal/AppModal";
import InventorySearchModal from "../../Modals/InventorySearchModal/InventorySearchModal";

import KardexControls from "./components/KardexControls";
import KardexEmptyState from "./components/KardexEmptyState";
import KardexProductPanel from "./components/KardexProductPanel";

import useKardex from "./hooks/useKardex";
import useKardexRemoveConfirmation from "./hooks/useKardexRemoveConfirmation";

import {
  exportKardexReport,
} from "./services/kardexExportService";

import styles from "./PageKardex.module.css";

const PageKardex = () => {
  const [
    exportingSlot,
    setExportingSlot,
  ] = useState(null);

  const [
    exportError,
    setExportError,
  ] = useState("");

  const {
    products,

    selectedProducts,
    selectedProductIds,

    modalTargetSlot,
    searchModalOpen,
    barcode,

    draftDateFrom,
    draftDateTo,
    appliedDateFrom,
    appliedDateTo,
    dateFilterError,
    isDateFilterActive,

    movementsState,
    rowsBySlot,

    setBarcode,
    setDraftDateFrom,
    setDraftDateTo,

    openProductSearch,
    closeProductSearch,
    selectProduct,
    removeProduct,
    searchBarcode,

    applyDateFilter,
    clearDateFilter,
  } = useKardex();

  const selectedProductCount =
    useMemo(() => {
      return selectedProductIds.filter(
        Boolean
      ).length;
    }, [selectedProductIds]);

  const hasSelectedProducts =
    selectedProductCount > 0;

  const {
    removeConfirmation,
    requestRemoveProduct,
    confirmRemoveProduct,
    closeRemoveConfirmation,
  } =
    useKardexRemoveConfirmation({
      selectedProducts,
      rowsBySlot,
      appliedDateFrom,
      appliedDateTo,
      removeProduct,

      onBeforeRemove: () => {
        setExportError("");
      },
    });

  const handleBarcodeSearch =
    () => {
      setExportError("");
      searchBarcode();
    };

  const handleApplyDateFilter =
    () => {
      setExportError("");
      applyDateFilter();
    };

  const handleClearDateFilter =
    () => {
      setExportError("");
      clearDateFilter();
    };

  const handleExport = async (
    slot
  ) => {
    const product =
      selectedProducts[slot];

    const rows =
      rowsBySlot[slot] ?? [];

    if (
      !product ||
      rows.length === 0
    ) {
      return;
    }

    if (
      exportingSlot !== null
    ) {
      return;
    }

    setExportingSlot(slot);
    setExportError("");

    try {
      await exportKardexReport({
        product,
        rows,
        dateFrom:
          appliedDateFrom,
        dateTo:
          appliedDateTo,
      });
    } catch (error) {
      console.error(
        "Error exportando kardex:",
        error
      );

      setExportError(
        error?.message ||
          "No se pudo exportar el kardex."
      );
    } finally {
      setExportingSlot(null);
    }
  };

  const handleSelectProduct = (
    product
  ) => {
    setExportError("");

    return selectProduct(
      product,
      modalTargetSlot
    );
  };

  return (
    <div
      className={
        styles.container
      }
    >
      <div
        className={
          styles.content
        }
      >
        <div
          className={
            styles.header
          }
        >
          <div>
            <h1
              className={
                styles.title
              }
            >
              Kardex
            </h1>

            <p
              className={
                styles.subtitle
              }
            >
              Consulta entradas,
              salidas y existencias
              históricas por
              producto.
            </p>
          </div>
        </div>

        <KardexControls
          barcode={barcode}
          draftDateFrom={
            draftDateFrom
          }
          draftDateTo={
            draftDateTo
          }
          dateFilterError={
            dateFilterError
          }
          isDateFilterActive={
            isDateFilterActive
          }
          hasSelectedProducts={
            hasSelectedProducts
          }
          onBarcodeChange={
            setBarcode
          }
          onBarcodeSearch={
            handleBarcodeSearch
          }
          onDateFromChange={
            setDraftDateFrom
          }
          onDateToChange={
            setDraftDateTo
          }
          onApplyDateFilter={
            handleApplyDateFilter
          }
          onClearDateFilter={
            handleClearDateFilter
          }
          onOpenProductSearch={() =>
            openProductSearch()
          }
        />

        {exportError ? (
          <div
            className={
              styles.controlError
            }
            role="alert"
          >
            {exportError}
          </div>
        ) : null}

        {hasSelectedProducts ? (
          <div
            className={`${styles.panelsGrid} ${
              selectedProductCount >
              1
                ? styles.twoCols
                : styles.oneCol
            }`}
          >
            {[0, 1].map(
              (slot) => {
                const product =
                  selectedProducts[
                    slot
                  ];

                if (!product) {
                  return null;
                }

                return (
                  <KardexProductPanel
                    key={
                      product?.id ??
                      product?.product_id ??
                      slot
                    }
                    slot={slot}
                    product={
                      product
                    }
                    rows={
                      rowsBySlot[
                        slot
                      ] ?? []
                    }
                    movementState={
                      movementsState[
                        slot
                      ]
                    }
                    appliedDateFrom={
                      appliedDateFrom
                    }
                    appliedDateTo={
                      appliedDateTo
                    }
                    showAddProduct={
                      selectedProductCount ===
                      1
                    }
                    onChangeProduct={(
                      targetSlot
                    ) =>
                      openProductSearch(
                        targetSlot
                      )
                    }
                    onAddProduct={() => {
                      const emptySlot =
                        selectedProducts[
                          0
                        ]
                          ? 1
                          : 0;

                      openProductSearch(
                        emptySlot
                      );
                    }}
                    onRemoveProduct={
                      requestRemoveProduct
                    }
                    onExport={
                      handleExport
                    }
                    exporting={
                      exportingSlot ===
                      slot
                    }
                  />
                );
              }
            )}
          </div>
        ) : (
          <KardexEmptyState />
        )}
      </div>

      <InventorySearchModal
        isOpen={
          searchModalOpen
        }
        onClose={
          closeProductSearch
        }
        products={
          products
        }
        selectedProductIds={
          selectedProductIds
        }
        onSelect={
          handleSelectProduct
        }
      />

      <AppModal
        isOpen={
          removeConfirmation.isOpen
        }
        type="warning"
        title={
          removeConfirmation.title
        }
        message={
          removeConfirmation.message
        }
        confirmText="Quitar"
        cancelText="Cancelar"
        showCancel
        onConfirm={
          confirmRemoveProduct
        }
        onCancel={
          closeRemoveConfirmation
        }
        onClose={
          closeRemoveConfirmation
        }
      />
    </div>
  );
};

export default PageKardex;