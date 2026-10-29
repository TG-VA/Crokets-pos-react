import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TicketNotesModal from "./TicketNotesModal";

const ticket = {
  folio: "1042",
  cashier: "Ana",
  client: "Juan Perez",
  date: "2026-10-28T14:32:00.000Z",
  notes: "Cliente pide factura el lunes.\nEntregar bolsa extra.",
};

const renderModal = (overrides = {}) => {
  const onClose = vi.fn();

  render(<TicketNotesModal ticket={ticket} onClose={onClose} {...overrides} />);

  return { onClose };
};

describe("TicketNotesModal", () => {
  it("muestra el folio, el cajero, el cliente y la nota completa", () => {
    renderModal();

    expect(
      screen.getByRole("heading", { name: "Notas del ticket 1042" })
    ).toBeTruthy();
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.getByText("Juan Perez")).toBeTruthy();
    expect(screen.getByText(/Cliente pide factura el lunes\./)).toBeTruthy();
    expect(screen.getByText(/Entregar bolsa extra\./)).toBeTruthy();
  });

  it("muestra el texto de respaldo cuando la nota esta vacia", () => {
    renderModal({ ticket: { ...ticket, notes: "   " } });

    expect(
      screen.getByText("Esta venta no tiene notas registradas.")
    ).toBeTruthy();
  });

  it("se cierra solo con la X: no hay boton de cierre en el pie", () => {
    const { onClose } = renderModal();

    const buttons = screen.getAllByRole("button");

    expect(buttons).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar notas" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("omite el cliente cuando es publico en general", () => {
    renderModal({ ticket: { ...ticket, client: "PÚBLICO EN GENERAL" } });

    expect(screen.queryByText("PÚBLICO EN GENERAL")).toBeNull();
  });

  it.each(["Publico en general", "  PÚBLICO EN GENERAL  "])(
    "omite el cliente publico aunque venga como %j",
    (client) => {
      renderModal({ ticket: { ...ticket, client } });

      expect(screen.queryByText(client.trim())).toBeNull();
    }
  );

  it("es un dialogo accesible con el folio como nombre", () => {
    renderModal();

    const dialog = screen.getByRole("dialog", {
      name: "Notas del ticket 1042",
    });

    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("etiqueta cada chip para lectores de pantalla", () => {
    renderModal();

    expect(screen.getByText("Cajero:")).toBeTruthy();
    expect(screen.getByText("Cliente:")).toBeTruthy();
    expect(screen.getByText("Fecha:")).toBeTruthy();
  });

  it("muestra la fecha del ticket", () => {
    renderModal();

    const dateChip = screen.getByText("Fecha:").closest("li");

    expect(dateChip.textContent).toMatch(/2026/);
  });

  it("se cierra con Escape una sola vez", () => {
    const { onClose } = renderModal();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignora otras teclas", () => {
    const { onClose } = renderModal();

    fireEvent.keyDown(window, { key: "Enter" });

    expect(onClose).not.toHaveBeenCalled();
  });
});
