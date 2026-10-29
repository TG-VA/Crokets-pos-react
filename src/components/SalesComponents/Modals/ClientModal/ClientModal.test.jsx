import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const db = vi.hoisted(() => ({ pointRows: [], fail: false }));

// Consulta encadenable y "await-able" que resuelve segun la tabla consultada.
vi.mock("../../../../lib/supabaseClient", () => {
  const buildQuery = (table) => {
    const result = () => ({
      data: table === "customer_points" ? db.pointRows : [],
      error:
        table === "customer_points" && db.fail ? { message: "falla" } : null,
    });
    const query = {
      select: () => query,
      eq: () => query,
      neq: () => query,
      in: () => query,
      or: () => query,
      order: () => query,
      limit: () => query,
      then: (resolve, reject) =>
        Promise.resolve(result()).then(resolve, reject),
    };
    return query;
  };

  return { supabase: { from: (table) => buildQuery(table) } };
});

import ClientModal from "./ClientModal";

const ASSIGNED_CLIENT = {
  id: "c1",
  name: "Ana",
  phone: "5551234567",
  points: 10,
};

const renderModal = (props = {}) =>
  render(
    <ClientModal
      isOpen
      onClose={() => {}}
      onAssignClient={() => {}}
      currentSaleClient={ASSIGNED_CLIENT}
      {...props}
    />
  );

describe("ClientModal: puntos del cliente ya asignado", () => {
  beforeEach(() => {
    db.pointRows = [];
    db.fail = false;
  });

  it("muestra los puntos actuales cuando cambiaron en otra sucursal", async () => {
    db.pointRows = [
      { customer_id: "c1", points: 20 },
      { customer_id: "c1", points: 5 },
    ];

    renderModal();

    await waitFor(() =>
      expect(screen.getAllByText("25").length).toBeGreaterThan(0)
    );
    expect(screen.queryByText("10")).toBeNull();
  });

  it("refleja puntos descontados en otra sucursal", async () => {
    db.pointRows = [{ customer_id: "c1", points: 4 }];

    renderModal();

    await waitFor(() =>
      expect(screen.getAllByText("4").length).toBeGreaterThan(0)
    );
    expect(screen.queryByText("10")).toBeNull();
  });

  it("entrega el saldo vigente al reasignar el cliente a la venta", async () => {
    db.pointRows = [{ customer_id: "c1", points: 25 }];
    const onAssignClient = vi.fn();

    renderModal({ onAssignClient });

    await waitFor(() =>
      expect(screen.getAllByText("25").length).toBeGreaterThan(0)
    );
    fireEvent.click(screen.getByRole("button", { name: /^Asignar cliente/ }));

    expect(onAssignClient).toHaveBeenCalledWith(
      expect.objectContaining({ id: "c1", points: 25 }),
      []
    );
  });

  it("conserva el snapshot si la consulta de puntos falla", async () => {
    db.fail = true;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderModal();

    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(screen.getAllByText("10").length).toBeGreaterThan(0);
    errorSpy.mockRestore();
  });
});
