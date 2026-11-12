import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import RouteTabs from "./RouteTabs";
import ExportIcon from "../../../../../assets/icons/file-export-solid-full.svg";
import ImportIcon from "../../../../../assets/icons/file-import-solid-full.svg";
import HistoryIcon from "../../../../../assets/icons/table-list-solid-full.svg";

const defaultProps = {
  activeTab: "send",
  pendingReceiptsCount: 0,
  onTabChange: vi.fn(),
};

describe("RouteTabs", () => {
  it("renderiza las tres pestañas del flujo de traspasos", () => {
    render(<RouteTabs {...defaultProps} />);
    expect(screen.getByRole("button", { name: /Enviar/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Recibir/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Historial/ })).toBeTruthy();
  });

  it("marca aria-current solo en la pestaña activa", () => {
    render(<RouteTabs {...defaultProps} activeTab="receive" />);
    expect(
      screen
        .getByRole("button", { name: /Recibir/ })
        .getAttribute("aria-current")
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: /Enviar/ })
        .getAttribute("aria-current")
    ).toBeNull();
  });

  it("muestra el badge de recepciones pendientes en Recibir", () => {
    render(<RouteTabs {...defaultProps} pendingReceiptsCount={4} />);
    expect(screen.getByRole("button", { name: /Recibir.*4/ })).toBeTruthy();
  });

  it("oculta el badge cuando no hay recepciones pendientes", () => {
    render(<RouteTabs {...defaultProps} pendingReceiptsCount={0} />);
    expect(
      screen.getByRole("button", { name: /Recibir/ }).textContent
    ).toContain("Recibir");
    expect(
      screen.getByRole("button", { name: /Recibir/ }).textContent
    ).not.toMatch(/\d/);
  });

  it("invoca onTabChange con el id de la pestaña pulsada", () => {
    const onTabChange = vi.fn();
    render(<RouteTabs {...defaultProps} onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Historial/ }));
    expect(onTabChange).toHaveBeenCalledWith("history");
  });

  it("renderiza el icono decorativo de cada pestaña", () => {
    const { container } = render(<RouteTabs {...defaultProps} />);
    const icons = container.querySelectorAll("nav img");

    expect(icons).toHaveLength(3);
    expect(icons[0].getAttribute("src")).toBe(ExportIcon);
    expect(icons[1].getAttribute("src")).toBe(ImportIcon);
    expect(icons[2].getAttribute("src")).toBe(HistoryIcon);
    icons.forEach((icon) => {
      expect(icon.getAttribute("aria-hidden")).toBe("true");
      expect(icon.getAttribute("alt")).toBe("");
    });
  });

  it("muestra la descripción de cada pestaña en todo momento", () => {
    render(<RouteTabs {...defaultProps} activeTab="history" />);
    expect(
      screen.getByText("Descuenta existencias de la sucursal origen.")
    ).toBeTruthy();
    expect(
      screen.getByText("Captura la llegada, diferencias y devoluciones.")
    ).toBeTruthy();
    expect(
      screen.getByText("Consulta los traspasos emitidos y recibidos.")
    ).toBeTruthy();
  });
});
