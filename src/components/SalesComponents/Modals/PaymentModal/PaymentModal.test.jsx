import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PaymentModal from "./PaymentModal";

const PRINT_MODE_KEY = "settings_print_mode";

const renderModal = (overrides = {}) => {
  const onProcessPayment = vi.fn().mockResolvedValue(true);
  const onClose = vi.fn();

  render(
    <PaymentModal
      isOpen
      total={150}
      processingSale={false}
      onProcessPayment={onProcessPayment}
      onClose={onClose}
      {...overrides}
    />
  );

  return { onProcessPayment, onClose };
};

describe("PaymentModal: modo de impresion y accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("pide confirmacion con F1 cuando el modo es confirm y cobra una sola vez", async () => {
    window.localStorage.setItem(PRINT_MODE_KEY, "confirm");
    const { onProcessPayment } = renderModal();

    fireEvent.keyDown(document, { key: "F1" });

    const dialog = await screen.findByRole("dialog", {
      name: "Confirmar impresión",
    });
    expect(dialog).toBeTruthy();
    expect(onProcessPayment).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "F1" });
    expect(onProcessPayment).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cobrar e imprimir" }));

    await waitFor(() => expect(onProcessPayment).toHaveBeenCalledTimes(1));
    expect(onProcessPayment).toHaveBeenCalledWith(
      expect.objectContaining({ shouldPrint: true })
    );
  });

  it("cancela la confirmacion sin procesar el pago", async () => {
    window.localStorage.setItem(PRINT_MODE_KEY, "confirm");
    const { onProcessPayment, onClose } = renderModal();

    fireEvent.keyDown(document, { key: "F1" });
    await screen.findByRole("dialog", { name: "Confirmar impresión" });

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Confirmar impresión" })
      ).toBeNull()
    );
    expect(onProcessPayment).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cobra e imprime directo con F1 en modo automatico", async () => {
    window.localStorage.setItem(PRINT_MODE_KEY, "auto");
    const { onProcessPayment } = renderModal();

    fireEvent.keyDown(document, { key: "F1" });

    await waitFor(() => expect(onProcessPayment).toHaveBeenCalledTimes(1));
    expect(onProcessPayment).toHaveBeenCalledWith(
      expect.objectContaining({ shouldPrint: true })
    );
    expect(
      screen.queryByRole("dialog", { name: "Confirmar impresión" })
    ).toBeNull();
  });

  it("asocia un label accesible a cada campo de pago visible", () => {
    renderModal();

    expect(screen.getByLabelText("Pagó Con:")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Transferencia" }));
    expect(screen.getByLabelText("Información de Transferencia:")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Mixto" }));
    expect(screen.getByLabelText("Efectivo:")).toBeTruthy();
    expect(screen.getByLabelText("Tarjeta:")).toBeTruthy();
    expect(screen.getByLabelText("Dólares (USD):")).toBeTruthy();
  });
});
