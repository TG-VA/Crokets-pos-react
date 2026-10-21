import { fireEvent, renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useEscapeKey } from "./useEscapeKey";

const pressEscape = () => {
  fireEvent.keyDown(window, { key: "Escape" });
};

describe("useEscapeKey", () => {
  it("ejecuta el callback al pulsar Escape", () => {
    const callback = vi.fn();

    renderHook(() => useEscapeKey(callback, true));

    pressEscape();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("no ejecuta el callback cuando esta inactivo", () => {
    const callback = vi.fn();

    renderHook(() => useEscapeKey(callback, false));

    pressEscape();

    expect(callback).not.toHaveBeenCalled();
  });

  it("registra el listener desde el montaje aunque siga inactivo", () => {
    const callback = vi.fn();
    const addSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useEscapeKey(callback, false));

    const registraKeydown = addSpy.mock.calls.some(
      ([type]) => type === "keydown"
    );
    addSpy.mockRestore();

    // Registrar el listener solo al activarse deja una ventana en la que la
    // tecla se pierde: un modal que habilita la accion al terminar de cargar
    // puede perder el Escape si el efecto pasivo aun no se ejecuto.
    expect(registraKeydown).toBe(true);
  });

  it("responde en cuanto se activa, sin esperar otro efecto", () => {
    const callback = vi.fn();

    const { rerender } = renderHook(
      ({ active }) => useEscapeKey(callback, active),
      { initialProps: { active: false } }
    );

    pressEscape();
    expect(callback).not.toHaveBeenCalled();

    rerender({ active: true });

    pressEscape();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("ignora otras teclas", () => {
    const callback = vi.fn();

    renderHook(() => useEscapeKey(callback, true));

    fireEvent.keyDown(window, { key: "Enter" });

    expect(callback).not.toHaveBeenCalled();
  });

  it("deja de responder al desmontarse", () => {
    const callback = vi.fn();

    const { unmount } = renderHook(() => useEscapeKey(callback, true));

    unmount();
    pressEscape();

    expect(callback).not.toHaveBeenCalled();
  });
});
