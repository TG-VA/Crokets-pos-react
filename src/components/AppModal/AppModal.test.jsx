import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AppModal from "./AppModal";

describe("AppModal footerActions", () => {
  it("renderiza las acciones extra junto al boton de confirmar", () => {
    render(
      <AppModal
        isOpen
        title="Detalle"
        confirmText="Cerrar"
        footerActions={<button type="button">Exportar</button>}
      />
    );

    const extra = screen.getByRole("button", { name: "Exportar" });
    const confirm = screen.getByRole("button", { name: "Cerrar" });

    expect(extra.parentElement).toBe(confirm.parentElement.firstElementChild);
  });

  it("no agrega contenedor cuando no hay acciones extra", () => {
    const { container } = render(
      <AppModal isOpen title="Detalle" confirmText="Cerrar" />
    );

    expect(container.querySelectorAll("button")).toHaveLength(1);
  });
});
