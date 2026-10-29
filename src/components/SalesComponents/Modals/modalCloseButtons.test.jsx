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

import PendingTicketModal from "./PendingTicketModal/PendingTicketModal";
import ChangeTicketModal from "./ChangeTicketModal/ChangeTicketModal";
import SearchModal from "./SearchModal/SearchModal";
import EntryModal from "./EntryModal/EntryModal";
import ExitModal from "./ExitModal/ExitModal";
import DeleteItemModal from "./DeleteItemModal/DeleteItemModal";
import DiscountModal from "./DiscountModal/DiscountModal";

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
      expect(
        screen.getAllByRole("button").some((button) => {
          return button.textContent.trim() === "Cancelar";
        })
      ).toBe(true);
    }
  );
});
