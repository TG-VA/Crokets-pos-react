import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, renderHook } from "@testing-library/react";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { ModalStackProvider } from "../../../contexts/ModalStackContext";

const NAV_ITEMS = [
  { path: "/ventas", shortcut: "F1" },
  { path: "/inventario", shortcut: "F2" },
];

const renderShortcuts = (initialLayers = []) =>
  renderHook(() => useKeyboardShortcuts(NAV_ITEMS), {
    wrapper: ({ children }) => (
      <ModalStackProvider initialLayers={initialLayers}>
        {children}
      </ModalStackProvider>
    ),
  });

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it("navega con el atajo cuando no hay modales abiertos", () => {
    renderShortcuts();

    fireEvent.keyDown(window, { key: "F2" });

    expect(navigateMock).toHaveBeenCalledWith("/inventario");
  });

  it("no navega mientras haya una capa modal abierta", () => {
    renderShortcuts(["sales-payment"]);

    fireEvent.keyDown(window, { key: "F2" });

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("ignora el atajo cuando se escribe en un campo de texto", () => {
    renderShortcuts();
    const input = document.createElement("input");
    document.body.appendChild(input);

    fireEvent.keyDown(input, { key: "F2" });

    expect(navigateMock).not.toHaveBeenCalled();
    input.remove();
  });
});
