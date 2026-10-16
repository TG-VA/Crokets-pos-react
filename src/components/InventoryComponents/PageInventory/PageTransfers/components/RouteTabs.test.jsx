import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import RouteTabs from "./RouteTabs";

const defaultProps = {
  activeTab: "send",
  pendingReceiptsCount: 0,
  onTabChange: vi.fn(),
};

describe("RouteTabs", () => {
  it("renderiza las tres pestañas del flujo de traspasos", () => {
    render(<RouteTabs {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Enviar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Recibir" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Historial" })).toBeTruthy();
  });

  it("marca aria-current solo en la pestaña activa", () => {
    render(<RouteTabs {...defaultProps} activeTab="receive" />);
    expect(
      screen
        .getByRole("button", { name: "Recibir" })
        .getAttribute("aria-current")
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "Enviar" })
        .getAttribute("aria-current")
    ).toBeNull();
  });

  it("muestra el badge de recepciones pendientes en Recibir", () => {
    render(<RouteTabs {...defaultProps} pendingReceiptsCount={4} />);
    expect(screen.getByRole("button", { name: /Recibir.*4/ })).toBeTruthy();
  });

  it("oculta el badge cuando no hay recepciones pendientes", () => {
    render(<RouteTabs {...defaultProps} pendingReceiptsCount={0} />);
    expect(screen.getByRole("button", { name: "Recibir" }).textContent).toBe(
      "Recibir"
    );
  });

  it("invoca onTabChange con el id de la pestaña pulsada", () => {
    const onTabChange = vi.fn();
    render(<RouteTabs {...defaultProps} onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Historial" }));
    expect(onTabChange).toHaveBeenCalledWith("history");
  });

  it("describe la pestaña activa con una sola pista compacta", () => {
    render(<RouteTabs {...defaultProps} activeTab="history" />);
    expect(
      screen.getByText("Consulta los traspasos emitidos y recibidos.")
    ).toBeTruthy();
    expect(
      screen.queryByText("Descuenta existencias de la sucursal origen.")
    ).toBeNull();
  });
});
