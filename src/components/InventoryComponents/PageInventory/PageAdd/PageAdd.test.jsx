import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PageAdd from "./PageAdd";
import useInventoryAdd from "./hooks/useInventoryAdd";
import AdminAuthorizationModal from "../../../AdminAuthorizationModal/AdminAuthorizationModal";

vi.mock("./hooks/useInventoryAdd", () => ({ default: vi.fn() }));

vi.mock("./hooks/useInventoryAddKeyboard", () => ({
  default: () => ({ handleContentKeyDown: vi.fn() }),
}));

vi.mock("./components/InventoryAddForm", () => ({ default: () => null }));

vi.mock("../../Modals/InventorySearchModal/InventorySearchModal", () => ({
  default: () => null,
}));

vi.mock("../../../AppModal/AppModal", () => ({ default: () => null }));

vi.mock("../../../AdminAuthorizationModal/AdminAuthorizationModal", () => ({
  default: vi.fn(() => null),
}));

const handleReauthorized = vi.fn();
const closeReauthorization = vi.fn();

const mockHook = (overrides = {}) => {
  useInventoryAdd.mockReturnValue({
    products: [],
    loadingProducts: false,
    productsError: null,
    searchModalOpen: false,
    barcode: "",
    selectedProduct: null,
    quantityToAdd: "",
    submitArmed: false,
    saving: false,
    appModal: { isOpen: false },
    reauthorizationOpen: true,
    branchId: "branch-1",
    currentInventory: 0,
    newInventory: 0,
    salePrice: 0,
    costEntry: {},
    quantityInputRef: { current: null },
    barcodeInputRef: { current: null },
    bodyRef: { current: null },
    setSubmitArmed: vi.fn(),
    setQuantityToAdd: vi.fn(),
    openSearchModal: vi.fn(),
    closeSearchModal: vi.fn(),
    closeAppModal: vi.fn(),
    cancelCurrentOperation: vi.fn(),
    handleBarcodeChange: vi.fn(),
    handleQuantityChange: vi.fn(),
    handleLookup: vi.fn(),
    loadProduct: vi.fn(),
    handleSubmit: vi.fn(),
    closeReauthorization,
    handleReauthorized,
    ...overrides,
  });
};

const lastModalProps = () => AdminAuthorizationModal.mock.lastCall[0];

describe("PageAdd: reautorizacion del alta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("conecta el modal con la accion, la sucursal y los callbacks del hook", () => {
    mockHook();
    render(<PageAdd />);

    const props = lastModalProps();

    expect(props.isOpen).toBe(true);
    expect(props.action).toBe("inventory_add_access");
    expect(props.branchId).toBe("branch-1");
    expect(props.onAuthorized).toBe(handleReauthorized);
    expect(props.onClose).toBe(closeReauthorization);
  });

  it("sigue la sucursal y el estado que entrega el hook", () => {
    mockHook({ reauthorizationOpen: false, branchId: "branch-2" });
    render(<PageAdd />);

    const props = lastModalProps();

    expect(props.isOpen).toBe(false);
    expect(props.branchId).toBe("branch-2");
  });
});
