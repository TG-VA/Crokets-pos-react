import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AppModal from "./AppModal";
import {
  ModalStackProvider,
  useModalStack,
} from "../../contexts/ModalStackContext";

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

describe("AppModal: capa en la pila de modales", () => {
  const Probe = ({ onChange }) => {
    onChange(useModalStack().hasOpenModals);
    return null;
  };

  const renderWithStack = (modals) => {
    const seen = { current: false };
    const tree = (nodes) => (
      <ModalStackProvider>
        <Probe
          onChange={(value) => {
            seen.current = value;
          }}
        />
        {nodes}
      </ModalStackProvider>
    );
    const view = render(tree(modals));
    return { seen, view, tree };
  };

  it("registra una capa al abrirse y la libera al cerrarse", () => {
    const { seen, view, tree } = renderWithStack(<AppModal isOpen title="A" />);
    expect(seen.current).toBe(true);

    view.rerender(tree(<AppModal isOpen={false} title="A" />));
    expect(seen.current).toBe(false);
  });

  it("mantiene la pila ocupada si cierra solo uno de dos avisos", () => {
    const { seen, view, tree } = renderWithStack(
      <>
        <AppModal isOpen title="A" />
        <AppModal isOpen title="B" />
      </>
    );

    view.rerender(
      tree(
        <>
          <AppModal isOpen={false} title="A" />
          <AppModal isOpen title="B" />
        </>
      )
    );

    expect(seen.current).toBe(true);
  });
});
