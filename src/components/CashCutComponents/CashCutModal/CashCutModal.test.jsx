import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CorteModal from "./CashCutModal";

const { getCashOperationSettings } = vi.hoisted(() => ({
  getCashOperationSettings: vi.fn(),
}));

vi.mock("../../../services/cashOperationSettingsService", () => ({
  getCashOperationSettings,
}));

const renderModal = ({ expectedAmount = 1000, onConfirm = vi.fn() } = {}) =>
  render(
    <CorteModal
      isOpen
      expectedAmount={expectedAmount}
      onClose={vi.fn()}
      onConfirm={onConfirm}
    />
  );

describe("CashCutModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCashOperationSettings.mockReturnValue({
      blindCountCut: false,
      requireCutDifferenceNote: true,
    });
  });

  it("muestra el monto esperado y la diferencia en arqueo abierto", () => {
    renderModal({ expectedAmount: 1000 });

    expect(screen.getByText("MONTO ESPERADO")).toBeTruthy();
    expect(screen.getByText("$1,000.00")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "1050" },
    });

    expect(screen.getByText(/Diferencia: \$50\.00/)).toBeTruthy();
  });

  it("no renderiza el monto esperado ni la diferencia en arqueo ciego", () => {
    getCashOperationSettings.mockReturnValue({
      blindCountCut: true,
      requireCutDifferenceNote: true,
    });

    renderModal({ expectedAmount: 1000 });

    expect(
      screen.getByText("Captura el conteo físico de efectivo en caja")
    ).toBeTruthy();
    expect(screen.queryByText("MONTO ESPERADO")).toBeNull();
    expect(screen.queryByText("$1,000.00")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "950" },
    });

    expect(screen.queryByText(/Diferencia:/)).toBeNull();
  });

  it("bloquea la confirmacion con alerta si hay descuadre y faltan notas", () => {
    const onConfirm = vi.fn();
    renderModal({ expectedAmount: 1000, onConfirm });

    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "950" },
    });

    expect(screen.getByText("NOTAS (obligatorio por diferencia)")).toBeTruthy();

    fireEvent.click(screen.getByText("Enter - Confirmar Corte"));

    expect(screen.getByText("Justificación requerida")).toBeTruthy();
    expect(
      screen.getByText(
        "Existe una diferencia en el corte. Debes ingresar un motivo o justificación en las notas."
      )
    ).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("permite confirmar con notas vacias cuando no hay descuadre", () => {
    const onConfirm = vi.fn();
    renderModal({ expectedAmount: 1000, onConfirm });

    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "1000" },
    });

    fireEvent.click(screen.getByText("Enter - Confirmar Corte"));

    expect(onConfirm).toHaveBeenCalledWith({
      counted: 1000,
      notes: "",
      expected: 1000,
    });
  });

  it("permite confirmar con notas vacias ante descuadre si la nota no es obligatoria", () => {
    getCashOperationSettings.mockReturnValue({
      blindCountCut: false,
      requireCutDifferenceNote: false,
    });

    const onConfirm = vi.fn();
    renderModal({ expectedAmount: 1000, onConfirm });

    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "950" },
    });

    fireEvent.click(screen.getByText("Enter - Confirmar Corte"));

    expect(onConfirm).toHaveBeenCalledWith({
      counted: 950,
      notes: "",
      expected: 1000,
    });
  });
});
