import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../services/cashOperationSettingsService", () => ({
  loadCashOperationSettings: vi.fn(),
}));

vi.mock("../services/branchScopeService", () => ({
  fetchBranchType: vi.fn(),
}));

import { BranchProvider, useBranch } from "./BranchContext";
import { loadCashOperationSettings } from "../services/cashOperationSettingsService";
import { fetchBranchType } from "../services/branchScopeService";

const Consumer = () => {
  const { branch, setBranch } = useBranch();
  return (
    <div>
      <span data-testid="branch-name">{branch?.name || "sin-sucursal"}</span>
      <button
        type="button"
        onClick={() => setBranch({ id: "b1", name: "Torres" })}
      >
        set
      </button>
      <button type="button" onClick={() => setBranch(null)}>
        clear
      </button>
    </div>
  );
};

describe("BranchContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    loadCashOperationSettings.mockResolvedValue({
      success: true,
      source: "remote",
      error: null,
    });
    fetchBranchType.mockResolvedValue({ data: "operational", error: null });
  });

  it("expone el valor nulo cuando no hay sucursal en cache", () => {
    render(
      <BranchProvider>
        <Consumer />
      </BranchProvider>
    );

    expect(screen.getByTestId("branch-name").textContent).toBe("sin-sucursal");
  });

  it("persiste la sucursal en localStorage al establecerla", () => {
    render(
      <BranchProvider>
        <Consumer />
      </BranchProvider>
    );

    fireEvent.click(screen.getByText("set"));

    expect(screen.getByTestId("branch-name").textContent).toBe("Torres");
    expect(JSON.parse(localStorage.getItem("currentBranch")).name).toBe(
      "Torres"
    );
  });

  it("elimina la sucursal de localStorage al limpiarla", () => {
    localStorage.setItem(
      "currentBranch",
      JSON.stringify({ id: "b1", name: "Torres" })
    );

    render(
      <BranchProvider>
        <Consumer />
      </BranchProvider>
    );

    expect(screen.getByTestId("branch-name").textContent).toBe("Torres");

    fireEvent.click(screen.getByText("clear"));

    expect(screen.getByTestId("branch-name").textContent).toBe("sin-sucursal");
    expect(localStorage.getItem("currentBranch")).toBeNull();
  });

  it("restaura la sucursal desde localStorage al montar", () => {
    localStorage.setItem(
      "currentBranch",
      JSON.stringify({ id: "b9", name: "Sucursal Cacheada" })
    );

    render(
      <BranchProvider>
        <Consumer />
      </BranchProvider>
    );

    expect(screen.getByTestId("branch-name").textContent).toBe(
      "Sucursal Cacheada"
    );
  });

  it("hidrata la configuracion de caja al restaurar la sucursal desde cache", async () => {
    localStorage.setItem(
      "currentBranch",
      JSON.stringify({ id: "branch-test", name: "Torres" })
    );

    render(
      <BranchProvider>
        <Consumer />
      </BranchProvider>
    );

    await waitFor(() => {
      expect(loadCashOperationSettings).toHaveBeenCalledWith({
        branchId: "branch-test",
      });
    });
  });

  it("hidrata la configuracion de caja al establecer una sucursal", async () => {
    render(
      <BranchProvider>
        <Consumer />
      </BranchProvider>
    );

    expect(loadCashOperationSettings).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("set"));

    await waitFor(() => {
      expect(loadCashOperationSettings).toHaveBeenCalledWith({
        branchId: "b1",
      });
    });
  });

  it("no consulta la configuracion de caja sin sucursal activa", () => {
    render(
      <BranchProvider>
        <Consumer />
      </BranchProvider>
    );

    expect(loadCashOperationSettings).not.toHaveBeenCalled();
  });

  it("conserva la sucursal si la hidratacion de caja falla", async () => {
    loadCashOperationSettings.mockRejectedValue(new Error("offline"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(
      "currentBranch",
      JSON.stringify({ id: "branch-test", name: "Torres" })
    );

    try {
      render(
        <BranchProvider>
          <Consumer />
        </BranchProvider>
      );

      await waitFor(() => {
        expect(loadCashOperationSettings).toHaveBeenCalledWith({
          branchId: "branch-test",
        });
      });

      expect(screen.getByTestId("branch-name").textContent).toBe("Torres");
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("tolera un JSON corrupto en cache", () => {
    localStorage.setItem("currentBranch", "{no-es-json");

    render(
      <BranchProvider>
        <Consumer />
      </BranchProvider>
    );

    expect(screen.getByTestId("branch-name").textContent).toBe("sin-sucursal");
  });

  it("lanza error si useBranch se usa fuera del provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(
      "useBranch debe usarse dentro de <BranchProvider />"
    );
    spy.mockRestore();
  });
});

describe("BranchContext: tipo de sucursal en cache", () => {
  const TypeConsumer = () => {
    const { branch } = useBranch();
    return <span data-testid="branch-type">{branch?.branch_type || "-"}</span>;
  };

  const renderWithCache = (cached) => {
    localStorage.setItem("currentBranch", JSON.stringify(cached));
    render(
      <BranchProvider>
        <TypeConsumer />
      </BranchProvider>
    );
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    loadCashOperationSettings.mockResolvedValue({ success: true });
  });

  it("completa branch_type de una sucursal en cache que no lo traia", async () => {
    fetchBranchType.mockResolvedValue({ data: "admin", error: null });
    renderWithCache({ id: "adm", name: "ADM-BREN" });

    await waitFor(() =>
      expect(screen.getByTestId("branch-type").textContent).toBe("admin")
    );
    expect(fetchBranchType).toHaveBeenCalledWith("adm");
    expect(JSON.parse(localStorage.getItem("currentBranch")).branch_type).toBe(
      "admin"
    );
  });

  it("conserva la sucursal en cache si la consulta falla", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchBranchType.mockResolvedValue({ data: null, error: new Error("red") });
    renderWithCache({ id: "b1", name: "Torres", branch_type: "operational" });

    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(screen.getByTestId("branch-type").textContent).toBe("operational");
    errorSpy.mockRestore();
  });
});
