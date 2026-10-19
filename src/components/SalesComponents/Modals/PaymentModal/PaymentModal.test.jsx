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

  it("oculta el metodo Dolares y el campo mixto en dolares cuando se desactiva acceptUsdPayments", () => {
    window.localStorage.setItem(
      "cash_operation_settings",
      JSON.stringify({ acceptUsdPayments: false })
    );
    renderModal();

    expect(screen.queryByRole("button", { name: "Dólares" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Mixto" }));
    expect(screen.getByLabelText("Efectivo:")).toBeTruthy();
    expect(screen.getByLabelText("Tarjeta:")).toBeTruthy();
    expect(screen.queryByLabelText("Dólares (USD):")).toBeNull();
    expect(screen.queryByText(/T\.C\./)).toBeNull();
  });

  it("muestra el tipo de cambio de configuracion como badge informativo en cobros en Dolares", () => {
    window.localStorage.setItem(
      "cash_operation_settings",
      JSON.stringify({ defaultExchangeRate: 20 })
    );
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Dólares" }));

    expect(screen.getByText("$20.00 MXN")).toBeTruthy();
    expect(screen.queryByLabelText("Tipo de cambio:")).toBeNull();
  });

  it("muestra el indicador de conversion T.C. en el desglose mixto cuando hay dolares habilitados", () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Mixto" }));

    expect(screen.getByText("(T.C. $18.50 MXN)")).toBeTruthy();
  });

  it("expande los ultimos 2 metodos para ocupar toda la fila cuando hay 5 visibles", () => {
    renderModal();

    expect(
      screen.getByRole("button", { name: "Terminal" }).style.gridColumn
    ).toBe("span 3");
    expect(
      screen.getByRole("button", { name: "Transferencia" }).style.gridColumn
    ).toBe("span 3");
  });

  it("expande el ultimo metodo para ocupar toda la fila cuando hay 4 visibles", () => {
    window.localStorage.setItem(
      "cash_operation_settings",
      JSON.stringify({ acceptUsdPayments: false })
    );
    renderModal();

    expect(
      screen.getByRole("button", { name: "Transferencia" }).style.gridColumn
    ).toBe("span 6");
  });

  describe("navegacion por flechas entre formas de pago", () => {
    it("avanza con ArrowRight desde Efectivo y da foco al input del metodo", () => {
      renderModal();

      expect(screen.getByLabelText("Pagó Con:")).toBeTruthy();

      fireEvent.keyDown(document, { key: "ArrowRight" });

      expect(screen.getByLabelText("Pagó Con (USD):")).toBeTruthy();
    });

    it("retrocede con ArrowLeft y no da la vuelta en el primer metodo", () => {
      renderModal();

      fireEvent.keyDown(document, { key: "ArrowLeft" });

      expect(screen.getByLabelText("Pagó Con:")).toBeTruthy();
    });

    it("no da la vuelta en el ultimo metodo al presionar ArrowRight", () => {
      renderModal();

      for (let i = 0; i < 5; i += 1) {
        fireEvent.keyDown(document, { key: "ArrowRight" });
      }

      expect(
        screen.getByLabelText("Información de Transferencia:")
      ).toBeTruthy();
    });

    it("omite Dolares al navegar cuando acceptUsdPayments esta desactivado", () => {
      window.localStorage.setItem(
        "cash_operation_settings",
        JSON.stringify({ acceptUsdPayments: false })
      );
      renderModal();

      fireEvent.keyDown(document, { key: "ArrowRight" });

      expect(screen.getByLabelText("Efectivo:")).toBeTruthy();
      expect(screen.queryByLabelText("Pagó Con (USD):")).toBeNull();
    });
  });
});
