import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPrinters from "./SettingsPrinters";

const { printTicket } = vi.hoisted(() => ({ printTicket: vi.fn() }));

vi.mock("../../../../utils/ticketPrinter", () => ({ printTicket }));

describe("SettingsPrinters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("arranca con el ancho por defecto de 58 mm y modo automático", () => {
    render(<SettingsPrinters />);

    expect(screen.getByLabelText("58 mm").checked).toBe(true);
    expect(screen.getByLabelText("80 mm").checked).toBe(false);
    expect(
      screen.getByLabelText("Imprimir automáticamente después de cobrar")
        .checked
    ).toBe(true);
  });

  it("persiste el ancho elegido y lo anuncia con role=status", async () => {
    render(<SettingsPrinters />);

    fireEvent.click(screen.getByLabelText("80 mm"));

    const status = await screen.findByRole("status");
    expect(status.textContent).toContain("80 mm");
    expect(window.localStorage.getItem("settings_ticket_width_mm")).toBe("80");
  });

  it("imprime el ticket de prueba con el perfil de papel configurado", async () => {
    printTicket.mockResolvedValue({
      success: true,
      message: "Ticket impreso correctamente.",
    });

    render(<SettingsPrinters />);

    fireEvent.click(screen.getByLabelText("80 mm"));
    fireEvent.click(
      screen.getByRole("button", { name: "Imprimir ticket de prueba" })
    );

    await waitFor(() => expect(printTicket).toHaveBeenCalledTimes(1));

    const [text, options] = printTicket.mock.calls[0];
    expect(text).toContain("TICKET DE PRUEBA");
    expect(text).toContain("80 mm");
    expect(options).toEqual({ profile: "80mm" });

    const statuses = await screen.findAllByRole("status");
    expect(
      statuses.some((node) =>
        node.textContent.includes("Ticket impreso correctamente.")
      )
    ).toBe(true);
  });

  it("anuncia con role=alert cuando la impresión falla", async () => {
    printTicket.mockResolvedValue({
      success: false,
      message: "No hay ninguna impresora configurada en el sistema.",
    });

    render(<SettingsPrinters />);

    fireEvent.click(
      screen.getByRole("button", { name: "Imprimir ticket de prueba" })
    );

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No hay ninguna impresora configurada");
  });
});
