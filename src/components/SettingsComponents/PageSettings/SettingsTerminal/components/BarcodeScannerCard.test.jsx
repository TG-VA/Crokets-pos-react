import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BarcodeScannerCard from "./BarcodeScannerCard";

describe("BarcodeScannerCard", () => {
  it("renderiza el titulo, el badge de alcance y la explicacion de plug & play", () => {
    render(<BarcodeScannerCard />);

    expect(
      screen.getByRole("heading", { name: "Lector de código de barras" })
    ).toBeTruthy();
    expect(screen.getByText("Solo este equipo")).toBeTruthy();
    expect(
      screen.getByText(/operan como dispositivos de emulación de teclado/i)
    ).toBeTruthy();
  });

  it("permite escanear con la tecla Enter y muestra feedback de exito", () => {
    render(<BarcodeScannerCard />);

    const input = screen.getByLabelText("Prueba interactiva de lectura");

    fireEvent.change(input, { target: { value: "750105531234" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByTestId("scanner-success-feedback")).toBeTruthy();
    expect(screen.getByText(/Lectura correcta con sufijo Enter/i)).toBeTruthy();
    expect(screen.getAllByText("750105531234")).toHaveLength(2);
    expect(screen.getByText("Enter detectado")).toBeTruthy();
  });

  it("muestra advertencia cuando el escaneo termina sin tecla Enter (ej. Tab)", () => {
    render(<BarcodeScannerCard />);

    const input = screen.getByLabelText("Prueba interactiva de lectura");

    fireEvent.change(input, { target: { value: "12345678" } });
    fireEvent.keyDown(input, { key: "Tab" });

    expect(screen.getByTestId("scanner-warning-feedback")).toBeTruthy();
    expect(screen.getByText(/Atención: Falta sufijo Enter/i)).toBeTruthy();
    expect(screen.getByText("Sin Enter")).toBeTruthy();
  });

  it("permite evaluar manualmente una entrada sin presionar Enter", () => {
    render(<BarcodeScannerCard />);

    const input = screen.getByLabelText("Prueba interactiva de lectura");

    fireEvent.change(input, { target: { value: "MANUAL999" } });

    const evalButton = screen.getByRole("button", {
      name: "Evaluar sin Enter",
    });
    fireEvent.click(evalButton);

    expect(screen.getByTestId("scanner-warning-feedback")).toBeTruthy();
    expect(screen.getAllByText("MANUAL999")).toHaveLength(2);
  });

  it("permite limpiar el historial de pruebas", () => {
    render(<BarcodeScannerCard />);

    const input = screen.getByLabelText("Prueba interactiva de lectura");

    fireEvent.change(input, { target: { value: "TEST-01" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getAllByText("TEST-01")).toHaveLength(2);

    const clearButton = screen.getByRole("button", {
      name: "Limpiar historial de pruebas",
    });
    fireEvent.click(clearButton);

    expect(screen.queryByText("TEST-01")).toBeNull();
    expect(screen.queryByText("Historial de lecturas de prueba")).toBeNull();
  });
});
