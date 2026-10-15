import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import HeroSection from "./HeroSection";

const defaultProps = {
  branch: { name: "Sucursal Centro" },
  pendingReceiptsCount: 3,
  transferMetrics: {
    sent: 12,
    pendingReceipts: 3,
    completedReceipts: 7,
    cancelled: 1,
    unitsInTransit: 5,
  },
};

describe("HeroSection", () => {
  it("renderiza la sucursal activa compactada en el hero", () => {
    render(<HeroSection {...defaultProps} />);
    expect(screen.getByText("Sucursal activa")).toBeTruthy();
    expect(screen.getByText("Sucursal Centro")).toBeTruthy();
  });

  it("renderiza los KPIs operativos sin combinar cancelados con transito", () => {
    render(<HeroSection {...defaultProps} />);
    expect(screen.getByText("Enviados")).toBeTruthy();
    expect(screen.getByText("En tránsito")).toBeTruthy();
    expect(screen.getByText("Por recibir")).toBeTruthy();
    expect(screen.getByText("Cancelados")).toBeTruthy();
    expect(screen.queryByText("Cancelados / En tránsito")).toBeNull();
  });

  it("muestra En tránsito como estado operativo prioritario", () => {
    render(<HeroSection {...defaultProps} />);
    const transitLabel = screen.getByText("En tránsito");
    expect(transitLabel.parentElement.textContent).toContain("5");

    const cancelledLabel = screen.getByText("Cancelados");
    expect(cancelledLabel.parentElement.textContent).toContain("1");
  });

  it("usa el conteo de recepciones pendientes para Por recibir", () => {
    render(<HeroSection {...defaultProps} />);
    const pendingLabel = screen.getByText("Por recibir");
    expect(pendingLabel.parentElement.textContent).toContain("3");
  });

  it("muestra fallback sin sucursal cuando no hay branch", () => {
    render(<HeroSection {...defaultProps} branch={null} />);
    expect(screen.getByText("Sin sucursal")).toBeTruthy();
  });
});
