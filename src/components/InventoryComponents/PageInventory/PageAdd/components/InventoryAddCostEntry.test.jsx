import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ENTRY_MODE } from "../services/inventoryAddProjectionService";
import { projectIncomingCost } from "../services/inventoryAddProjectionService";
import InventoryAddCostEntry from "./InventoryAddCostEntry";

const product = {
  product_id: "prod-1",
  codigo: "7501",
  descripcion: "Alimento",
  existencia: 10,
  costo: 100,
  precio: 250,
};

const buildCostEntry = (overrides = {}) => {
  const entryMode = overrides.entryMode ?? ENTRY_MODE.PURCHASE;
  const incomingCostInput = overrides.incomingCostInput ?? "100.00";

  // El helper replica el guard de `useInventoryAddCost`: un campo vacio viaja
  // como `null`, no como `0`. Si se dejara `Number("")`, esta suite construiria
  // una proyeccion que el hook jamas produce y dejaria de medir la de la interfaz.
  const incomingCostPrice = incomingCostInput.trim()
    ? Number(incomingCostInput)
    : null;

  const projection =
    overrides.projection ??
    projectIncomingCost({
      product,
      quantity: overrides.quantity ?? 10,
      entryMode,
      incomingCostPrice,
    });

  return {
    isPurchase: entryMode === ENTRY_MODE.PURCHASE,
    incomingCostInput,
    currentCost: 100,
    costError: overrides.costError ?? null,
    projection,
    setEntryMode: overrides.setEntryMode ?? vi.fn(),
    handleIncomingCostChange: overrides.handleIncomingCostChange ?? vi.fn(),
  };
};

const renderEntry = (costEntry, props = {}) =>
  render(<InventoryAddCostEntry costEntry={costEntry} {...props} />);

describe("InventoryAddCostEntry", () => {
  it("no renderiza nada sin proyeccion", () => {
    const { container } = renderEntry({});

    expect(container.innerHTML).toBe("");
  });

  describe("selector de tipo de entrada", () => {
    it("ofrece compra y entrada manual como un unico grupo de radio", () => {
      renderEntry(buildCostEntry());

      const group = screen.getByRole("radiogroup", {
        name: "Tipo de entrada de inventario",
      });

      expect(group).toBeTruthy();
      expect(
        screen.getByRole("radio", { name: /Compra \/ Recepcion de factura/ })
      ).toBeTruthy();
      expect(
        screen.getByRole("radio", {
          name: /Entrada manual \/ Ajuste de conteo/,
        })
      ).toBeTruthy();
    });

    it("marca compra como seleccionada por defecto", () => {
      renderEntry(buildCostEntry());

      expect(
        screen
          .getByRole("radio", { name: /Compra \/ Recepcion/ })
          .getAttribute("aria-checked")
      ).toBe("true");
      expect(
        screen
          .getByRole("radio", { name: /Entrada manual/ })
          .getAttribute("aria-checked")
      ).toBe("false");
    });

    it("propaga el modoSelection al callback", () => {
      const setEntryMode = vi.fn();

      renderEntry(buildCostEntry({ setEntryMode }));

      fireEvent.click(screen.getByRole("radio", { name: /Entrada manual/ }));

      expect(setEntryMode).toHaveBeenCalledWith(ENTRY_MODE.MANUAL);
    });

    it("deshabilita las opciones mientras se guarda", () => {
      renderEntry(buildCostEntry(), { disabled: true });

      expect(
        screen.getByRole("radio", { name: /Compra \/ Recepcion/ }).disabled
      ).toBe(true);
    });
  });

  describe("modo compra", () => {
    it("muestra el campo de costo editable con el valor capturado", () => {
      renderEntry(buildCostEntry({ incomingCostInput: "399.50" }));

      const input = screen.getByLabelText("Costo unitario de compra");

      expect(input.value).toBe("399.50");
      expect(input.getAttribute("aria-invalid")).toBe("false");
    });

    it("propaga la captura al sanitizador del hook", () => {
      const handleIncomingCostChange = vi.fn();

      renderEntry(buildCostEntry({ handleIncomingCostChange }));

      fireEvent.change(screen.getByLabelText("Costo unitario de compra"), {
        target: { value: "412.75" },
      });

      expect(handleIncomingCostChange).toHaveBeenCalledTimes(1);
    });

    it("expone el mensaje de validacion y marca el campo invalido", () => {
      renderEntry(
        buildCostEntry({ incomingCostInput: "", costError: "Ingresa el costo" })
      );

      const input = screen.getByLabelText("Costo unitario de compra");
      const error = screen.getByRole("alert");

      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(input.getAttribute("aria-describedby")).toBe(
        "inventory-incoming-cost-error"
      );
      expect(error.textContent).toBe("Ingresa el costo");
    });

    it("no muestra el mensaje de validacion cuando el costo es valido", () => {
      renderEntry(buildCostEntry());

      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  describe("modo entrada manual", () => {
    it("oculta el campo de costo de compra", () => {
      renderEntry(
        buildCostEntry({
          entryMode: ENTRY_MODE.MANUAL,
          incomingCostInput: "100.00",
        })
      );

      expect(screen.queryByLabelText("Costo unitario de compra")).toBeNull();
    });

    it("advierte que la mercancia entra al CPP vigente sin alterarlo", () => {
      renderEntry(buildCostEntry({ entryMode: ENTRY_MODE.MANUAL }));

      expect(screen.getByText(/el CPP no se alterara/)).toBeTruthy();
    });
  });

  describe("tarjeta de proyeccion", () => {
    it("compara stock y costo actuales contra la entrada por compra", () => {
      renderEntry(
        buildCostEntry({ quantity: 10, incomingCostInput: "400.00" })
      );

      expect(screen.getByText("Stock actual")).toBeTruthy();
      expect(screen.getByText(/10 pzs \(Costo: \$100\.00\)/)).toBeTruthy();
      expect(screen.getByText(/10 pzs \(Compra: \$400\.00\)/)).toBeTruthy();
      expect(screen.getByText("Stock resultante")).toBeTruthy();
      expect(screen.getByText(/20 pzs/)).toBeTruthy();
    });

    it("muestra el CPP resultante ponderado en vivo", () => {
      renderEntry(
        buildCostEntry({ quantity: 10, incomingCostInput: "400.00" })
      );

      // ((10*100) + (10*400)) / 20 = 250
      expect(screen.getByText("Nuevo Costo Promedio")).toBeTruthy();
      expect(screen.getByText("$250.00")).toBeTruthy();
      expect(
        screen.getByText(/\+\$150\.00 respecto al costo vigente/)
      ).toBeTruthy();
    });

    it("explica que el CPP no se mueve cuando la compra va al costo vigente", () => {
      renderEntry(
        buildCostEntry({ quantity: 10, incomingCostInput: "100.00" })
      );

      expect(screen.getByText("$100.00")).toBeTruthy();
      expect(
        screen.getByText(/Sin cambio: la entrada entra al costo vigente/)
      ).toBeTruthy();
    });

    it("marca el reprecio a la baja con signo negativo", () => {
      renderEntry(buildCostEntry({ quantity: 10, incomingCostInput: "50.00" }));

      expect(screen.getByText("$75.00")).toBeTruthy();
      expect(
        screen.getByText(/-\$25\.00 respecto al costo vigente/)
      ).toBeTruthy();
    });

    it("invita a capturar la cantidad cuando aun no hay entrada", () => {
      renderEntry(buildCostEntry({ quantity: 0 }));

      expect(screen.getByText("Captura la cantidad")).toBeTruthy();
    });

    it("muestra el CPP vigente mientras no hay cantidad, sin prometer un reprecio", () => {
      renderEntry(buildCostEntry({ quantity: 0, incomingCostInput: "400.00" }));

      expect(screen.getByText("$100.00")).toBeTruthy();
      expect(screen.queryByText(/respecto al costo vigente/)).toBeNull();
    });

    it("detalla el importe del lote cuando la entrada es por compra", () => {
      renderEntry(
        buildCostEntry({ quantity: 10, incomingCostInput: "400.00" })
      );

      expect(screen.getByText(/Importe del lote: \$4,000\.00/)).toBeTruthy();
    });

    it("no colapsa el CPP a cero cuando el campo de costo esta vacio", () => {
      renderEntry(
        buildCostEntry({
          quantity: 10,
          incomingCostInput: "",
          costError: "Ingresa el costo",
        })
      );

      expect(screen.getByText("$100.00")).toBeTruthy();
      expect(
        screen.getByText(/Sin cambio: la entrada entra al costo vigente/)
      ).toBeTruthy();
    });
  });
});
