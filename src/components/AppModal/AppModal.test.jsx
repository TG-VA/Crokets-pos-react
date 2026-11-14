import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AppModal from "./AppModal";
import styles from "./AppModal.module.css";
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

describe("AppModal confirmDisabled", () => {
  it("deshabilita confirmar y no ejecuta onConfirm con Enter", () => {
    const onConfirm = vi.fn();
    render(
      <AppModal
        isOpen
        title="Borrar"
        confirmText="Eliminar"
        confirmDisabled
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole("button", { name: "Eliminar" }).disabled).toBe(
      true
    );
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("AppModal: posicion del icono", () => {
  const getParts = (container) => ({
    icon: container.querySelector(`.${styles.iconWrapper}`),
    body: container.querySelector(`.${styles.body}`),
    header: container.querySelector(`.${styles.header}`),
  });

  it("en size large deja el icono en un header fijo fuera del scroll", () => {
    const { container } = render(
      <AppModal isOpen size="large" title="Detalle" />
    );
    const { icon, body, header } = getParts(container);

    expect(icon).not.toBeNull();
    expect(header).not.toBeNull();
    expect(header.contains(icon)).toBe(true);
    expect(body.contains(icon)).toBe(false);
    expect(body.querySelector(`.${styles.iconWrapper}`)).toBeNull();
    expect(container.querySelectorAll(`.${styles.iconWrapper}`)).toHaveLength(
      1
    );
    expect(header.nextElementSibling).toBe(body);
    expect(icon.getAttribute("aria-hidden")).toBe("true");
  });

  it("en size por defecto mantiene el icono dentro del cuerpo", () => {
    const { container } = render(<AppModal isOpen title="Aviso" />);
    const { icon, body, header } = getParts(container);

    expect(header).toBeNull();
    expect(body.contains(icon)).toBe(true);
  });
});
