import { beforeAll, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "b1" } }),
}));

vi.mock("../../../services/cashOperationSettingsService", () => ({
  getCashOperationSettings: vi.fn().mockResolvedValue({}),
}));

vi.mock("./SearchModal/useSearchModal", () => ({
  useSearchModal: () => ({
    searchTerm: "",
    searchResults: [],
    selectedIndex: -1,
    setSelectedIndex: vi.fn(),
    selectedProduct: null,
    selectedProductStocks: [],
    kitValidation: null,
    loading: false,
    loadingStocks: false,
    addingProduct: false,
    error: "",
    appModal: { isOpen: false },
    resultsListRef: { current: null },
    searchInputRef: { current: null },
    closeAppModal: vi.fn(),
    handleClose: vi.fn(),
    handleInputChange: vi.fn(),
    handleSelectProduct: vi.fn(),
    handleAddToSale: vi.fn(),
    canAddSelectedProduct: () => false,
  }),
}));

vi.mock("./VerifierModal/useVerifier", () => ({
  useVerifier: () => ({
    barcode: "",
    setBarcode: vi.fn(),
    product: null,
    kitItems: [],
    isLoading: false,
    error: "",
    inputRef: { current: null },
    handleClose: vi.fn(),
    handleSearchProduct: vi.fn(),
    handleAddToSale: vi.fn(),
    canAddToSale: false,
  }),
}));

vi.mock("./RewardProductSelectionModal/useRewardProductSelection", () => ({
  useRewardProductSelection: () => ({
    rewardProducts: {},
    selectedProductsByReward: {},
    searchByReward: {},
    setSearchByReward: vi.fn(),
    loadingProducts: false,
    saving: false,
    setSaving: vi.fn(),
    error: "",
    appModal: { isOpen: false },
    closeAppModal: vi.fn(),
    freeProductRewards: [],
    getInventoryStatus: vi.fn(),
    getSelectedQuantityForReward: () => 0,
    getSelectedQuantityForProduct: () => 0,
    getFilteredOptionsForReward: () => [],
    handleAddProduct: vi.fn(),
    handleSubtractProduct: vi.fn(),
    svc: { getRewardQuantity: () => 0 },
  }),
}));

vi.mock(
  "./ProductDiscountRewardModal/useProductDiscountReward",
  async (importOriginal) => ({
    ...(await importOriginal()),
    useProductDiscountReward: () => ({
      searchTerm: "",
      setSearchTerm: vi.fn(),
      inventoryByProduct: {},
      loadingProducts: false,
      saving: false,
      setSaving: vi.fn(),
      error: "",
      setError: vi.fn(),
      appModal: { isOpen: false },
      closeAppModal: vi.fn(),
      showAppWarning: vi.fn(),
      rewardQuantity: 1,
      rewardRedeemQuantity: 1,
      totalUnitsToApply: 1,
      selectedProductsCount: 0,
      selectedProducts: [],
      filteredProducts: [],
      getInventoryStatus: vi.fn(),
      handleAddProduct: vi.fn(),
      handleSubtractProduct: vi.fn(),
      productUsesInventory: () => false,
    }),
  })
);

import PendingTicketModal from "./PendingTicketModal/PendingTicketModal";
import ChangeTicketModal from "./ChangeTicketModal/ChangeTicketModal";
import SearchModal from "./SearchModal/SearchModal";
import EntryModal from "./EntryModal/EntryModal";
import ExitModal from "./ExitModal/ExitModal";
import DeleteItemModal from "./DeleteItemModal/DeleteItemModal";
import DiscountModal from "./DiscountModal/DiscountModal";
import VerifierModal from "./VerifierModal/VerifierModal";
import RewardProductSelectionModal from "./RewardProductSelectionModal/RewardProductSelectionModal";
import ProductDiscountRewardModal from "./ProductDiscountRewardModal/ProductDiscountRewardModal";

const noop = () => {};

// Modales de captura: el cierre es solo el boton de pie, sin X en la cabecera.
const MODALS_WITHOUT_X = [
  [
    "Ticket pendiente",
    <PendingTicketModal isOpen onClose={noop} onAccept={noop} />,
  ],
  [
    "Cambiar ticket pendiente",
    <ChangeTicketModal
      isOpen
      onClose={noop}
      onSelectTicket={noop}
      pendingTickets={[
        {
          name: "Ticket 1",
          total: 10,
          products: [{ id: "p1" }],
          date: "2026-10-29T10:00:00.000Z",
        },
      ]}
    />,
  ],
  ["Busqueda de productos", <SearchModal isOpen onClose={noop} />],
  ["Entrada de efectivo", <EntryModal isOpen onClose={noop} />],
  ["Salida de efectivo", <ExitModal isOpen onClose={noop} />],
  [
    "Eliminar articulo",
    <DeleteItemModal
      isOpen
      onClose={noop}
      onConfirmDelete={noop}
      selectedProduct={{ name: "Croqueta", cantidad: 1, importe: 10 }}
    />,
  ],
  [
    "Descuento",
    <DiscountModal
      isOpen
      onClose={noop}
      selectedProduct={{ name: "Croqueta", precio: 10, cantidad: 1 }}
    />,
  ],
];

describe("Modales de Ventas: botones de cierre", () => {
  beforeAll(() => {
    // jsdom no implementa scrollIntoView, que usan las listas navegables.
    window.Element.prototype.scrollIntoView = vi.fn();
  });

  it.each(MODALS_WITHOUT_X)(
    "%s no muestra la X de cabecera",
    (_name, modal) => {
      render(modal);

      expect(screen.queryByRole("button", { name: "Cerrar modal" })).toBeNull();
      const buttons = screen.getAllByRole("button");

      // Un unico boton de cierre en el pie y ningun texto con la tecla Esc.
      expect(
        buttons.filter((button) => button.textContent.trim() === "Cancelar")
      ).toHaveLength(1);
      expect(
        buttons.some((button) => /cerrar|esc\s*-/i.test(button.textContent))
      ).toBe(false);
    }
  );

  const MODALS_WITH_ONLY_X = [
    ["Verificador de precios", <VerifierModal isOpen onClose={noop} />],
    [
      "Aplicar recompensas",
      <RewardProductSelectionModal isOpen onClose={noop} onConfirm={noop} />,
    ],
    [
      "Aplicar descuento",
      <ProductDiscountRewardModal
        isOpen
        reward={{ id: "r1" }}
        cartProducts={[]}
        onClose={noop}
        onConfirm={noop}
      />,
    ],
  ];

  it.each(MODALS_WITH_ONLY_X)(
    "%s no tiene boton de cierre redundante en el pie",
    (_name, modal) => {
      render(modal);

      const buttons = screen.getAllByRole("button");

      expect(
        buttons.some((button) =>
          /^(esc\s*-\s*)?(cerrar|cancelar)$/i.test(button.textContent.trim())
        )
      ).toBe(false);
    }
  );
});
