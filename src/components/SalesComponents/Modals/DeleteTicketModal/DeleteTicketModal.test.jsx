import { beforeAll, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import DeleteTicketModal from "./DeleteTicketModal";

const TICKETS = [
  {
    name: "Ticket 1",
    total: 10,
    products: [{ id: "p1" }],
    date: "2026-10-29T10:00:00.000Z",
  },
];

describe("DeleteTicketModal: cierre y ayuda de teclado", () => {
  beforeAll(() => {
    // jsdom no implementa scrollIntoView, que usan las listas navegables.
    window.Element.prototype.scrollIntoView = vi.fn();
  });

  it("no muestra la X y la ayuda solo menciona Enter para eliminar", () => {
    render(
      <DeleteTicketModal
        isOpen
        onClose={() => {}}
        onDeleteTicket={() => {}}
        pendingTickets={TICKETS}
      />
    );

    expect(screen.queryByRole("button", { name: "Cerrar modal" })).toBeNull();
    expect(screen.getByText("↑↓ Navegar • Enter para eliminar")).toBeTruthy();
  });

  it("Delete no abre la confirmacion y Enter si", () => {
    render(
      <DeleteTicketModal
        isOpen
        onClose={() => {}}
        onDeleteTicket={() => {}}
        pendingTickets={TICKETS}
      />
    );

    fireEvent.keyDown(document, { key: "ArrowDown" });
    fireEvent.keyDown(document, { key: "Delete" });
    expect(screen.queryByText("¿Estás seguro?")).toBeNull();

    fireEvent.keyDown(document, { key: "Enter" });
    expect(screen.getByText("¿Estás seguro?")).toBeTruthy();
  });
});
