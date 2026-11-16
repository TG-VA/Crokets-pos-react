import { describe, expect, it, vi } from "vitest";
import { act, render, renderHook } from "@testing-library/react";

vi.mock("../../../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));
vi.mock("../../../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "b1" } }),
}));
vi.mock("../services/ordersService", () => ({ createStoreOrder: vi.fn() }));

import { OrderDraftProvider } from "../../../../../contexts/OrderDraftContext";
import { useCreateOrderForm } from "./useCreateOrderForm";

const wrapper = ({ children }) => (
  <OrderDraftProvider>{children}</OrderDraftProvider>
);

const buildProduct = (overrides = {}) => ({
  id: "p1",
  codigo: "COD-1",
  descripcion: "CROQUETA",
  departamento: "Alimento",
  costo: 10,
  is_global: true,
  ...overrides,
});

const renderForm = (products) =>
  renderHook(
    () =>
      useCreateOrderForm({
        currentBranch: { id: "b1" },
        branches: [],
        products,
      }),
    { wrapper }
  );

describe("useCreateOrderForm productos permitidos", () => {
  it("agrega un producto global", () => {
    const { result } = renderForm([]);

    let added;
    act(() => {
      added = result.current.addProduct(buildProduct());
    });

    expect(added).toBe(true);
    expect(result.current.items).toHaveLength(1);
  });

  it.each([
    ["local", false],
    ["sin marcar", null],
  ])("rechaza un producto %s", (_label, isGlobal) => {
    const product = buildProduct({ is_global: isGlobal });
    const { result } = renderForm([product]);

    let added;
    act(() => {
      added = result.current.addProduct(product);
    });

    expect(added).toBe(false);
    expect(result.current.items).toHaveLength(0);
    expect(result.current.error).toContain("no global");
  });

  it("rechaza un kit aunque sea global", () => {
    const kit = buildProduct({ id: "k1", is_kit: true });
    const { result } = renderForm([kit]);

    let added;
    act(() => {
      added = result.current.addProduct(kit);
    });

    expect(added).toBe(false);
    expect(result.current.items).toHaveLength(0);
    expect(result.current.error).toContain("kits");
  });

  it("rechaza un kit capturado por codigo de barras", () => {
    const kit = buildProduct({ id: "k1", codigo: "KIT-1", is_kit: true });
    const { result } = renderForm([kit]);

    let added;
    act(() => {
      added = result.current.handleCodeSubmit("kit-1");
    });

    expect(added).toBe(false);
    expect(result.current.items).toHaveLength(0);
  });

  it("rechaza un producto sin inventario capturado por codigo de barras", () => {
    const service = buildProduct({
      id: "s1",
      codigo: "SRV-1",
      tracks_inventory: false,
    });
    const { result } = renderForm([service]);

    let added;
    act(() => {
      added = result.current.handleCodeSubmit("srv-1");
    });

    expect(added).toBe(false);
    expect(result.current.items).toHaveLength(0);
    expect(result.current.error).toContain("no maneja inventario");
  });
});

describe("useCreateOrderForm persistencia del borrador", () => {
  it("conserva el borrador al desmontar y volver a montar el formulario", () => {
    const props = { currentBranch: { id: "b1" }, branches: [], products: [] };
    let form;
    const Form = () => {
      form = useCreateOrderForm(props);
      return null;
    };
    const App = ({ show }) => (
      <OrderDraftProvider>{show ? <Form /> : null}</OrderDraftProvider>
    );

    const { rerender } = render(<App show />);
    act(() => {
      form.setOrderName("pedido a");
      form.addProduct(buildProduct());
    });

    rerender(<App show={false} />);
    rerender(<App show />);

    expect(form.orderName).toBe("PEDIDO A");
    expect(form.items).toHaveLength(1);
  });
});

describe("useCreateOrderForm origen de stock", () => {
  const branches = [
    { id: "b1", name: "Centro" },
    { id: "b2", name: "Norte" },
    { id: "b3", name: "Sur" },
  ];

  const renderWithBranch = (currentBranch) =>
    renderHook(
      () => useCreateOrderForm({ currentBranch, branches, products: [] }),
      { wrapper }
    );

  it("una terminal operativa envia desde su sucursal sin elegir origen", () => {
    const { result } = renderWithBranch({ id: "b1" });

    expect(result.current.canChooseOrigin).toBe(false);
    expect(result.current.originBranchId).toBe("b1");
    expect(result.current.destinationOptions.map((b) => b.id)).toEqual([
      "b2",
      "b3",
    ]);
  });

  it("una terminal admin no preselecciona origen y elige entre operativas", () => {
    const { result } = renderWithBranch({ id: "adm", branch_type: "admin" });

    expect(result.current.canChooseOrigin).toBe(true);
    expect(result.current.originBranchId).toBe("");
    expect(result.current.originOptions).toEqual(branches);

    act(() => result.current.setOriginBranchId("b2"));

    expect(result.current.originBranchId).toBe("b2");
    expect(result.current.destinationOptions.map((b) => b.id)).toEqual([
      "b1",
      "b3",
    ]);
  });

  it("una terminal admin sin origen no puede guardar", () => {
    const { result } = renderWithBranch({ id: "adm", branch_type: "admin" });

    act(() => {
      result.current.setOrderName("REPOSICION");
      result.current.setDestinationBranchId("b1");
      result.current.addProduct(buildProduct());
    });
    act(() => result.current.updateQuantity("p1", "2"));

    expect(result.current.isValid).toBe(false);

    act(() => result.current.setOriginBranchId("b2"));

    expect(result.current.isValid).toBe(true);
  });

  it("invalida el pedido si el origen elegido coincide con el destino", () => {
    const { result } = renderWithBranch({ id: "adm", branch_type: "admin" });

    act(() => {
      result.current.setOrderName("REPOSICION");
      result.current.setDestinationBranchId("b1");
      result.current.addProduct(buildProduct());
    });
    act(() => result.current.updateQuantity("p1", "2"));
    act(() => result.current.setOriginBranchId("b1"));

    expect(result.current.isValid).toBe(false);
  });

  it("limpia el destino si el origen elegido coincide con el", () => {
    const { result } = renderWithBranch({ id: "adm", branch_type: "admin" });

    act(() => result.current.setDestinationBranchId("b1"));
    act(() => result.current.setOriginBranchId("b1"));

    expect(result.current.destinationBranchId).toBe("");
    expect(result.current.destinationOptions.map((b) => b.id)).toEqual([
      "b2",
      "b3",
    ]);
  });

  it("conserva el destino si el origen elegido es distinto", () => {
    const { result } = renderWithBranch({ id: "adm", branch_type: "admin" });

    act(() => result.current.setDestinationBranchId("b1"));
    act(() => result.current.setOriginBranchId("b2"));

    expect(result.current.destinationBranchId).toBe("b1");
  });
});
