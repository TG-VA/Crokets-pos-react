import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";

import {
  ModalStackProvider,
  useModalLayer,
  useModalStack,
} from "./ModalStackContext";

const wrapper = ({ children }) => (
  <ModalStackProvider>{children}</ModalStackProvider>
);

describe("ModalStackContext", () => {
  it("sin proveedor el estado es inactivo y estable", () => {
    const { result } = renderHook(() => useModalStack());

    expect(result.current.hasOpenModals).toBe(false);
    expect(result.current.topLayerId).toBeNull();
  });

  it("registra y libera capas modales", () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => {
        useModalLayer(isOpen, "capa-1");
        return useModalStack();
      },
      { wrapper, initialProps: { isOpen: false } }
    );

    expect(result.current.hasOpenModals).toBe(false);

    rerender({ isOpen: true });
    expect(result.current.hasOpenModals).toBe(true);
    expect(result.current.topLayerId).toBe("capa-1");

    rerender({ isOpen: false });
    expect(result.current.hasOpenModals).toBe(false);
    expect(result.current.topLayerId).toBeNull();
  });

  it("apila capas anidadas y deja arriba la ultima registrada", () => {
    const { result, rerender } = renderHook(
      ({ firstOpen, secondOpen }) => {
        useModalLayer(firstOpen, "base");
        useModalLayer(secondOpen, "anidada");
        return useModalStack();
      },
      {
        wrapper,
        initialProps: { firstOpen: true, secondOpen: false },
      }
    );

    expect(result.current.topLayerId).toBe("base");

    rerender({ firstOpen: true, secondOpen: true });
    expect(result.current.hasOpenModals).toBe(true);
    expect(result.current.topLayerId).toBe("anidada");

    rerender({ firstOpen: true, secondOpen: false });
    expect(result.current.topLayerId).toBe("base");

    rerender({ firstOpen: false, secondOpen: false });
    expect(result.current.hasOpenModals).toBe(false);
  });

  it("respetar capas iniciales precargadas", () => {
    const { result } = renderHook(() => useModalStack(), {
      wrapper: ({ children }) => (
        <ModalStackProvider initialLayers={["inicial"]}>
          {children}
        </ModalStackProvider>
      ),
    });

    expect(result.current.hasOpenModals).toBe(true);
    expect(result.current.topLayerId).toBe("inicial");
  });

  it("actualiza el valor de contexto al registrar en un acto", () => {
    const { result } = renderHook(
      () => {
        const stack = useModalStack();
        return stack;
      },
      { wrapper }
    );

    let unregister;
    act(() => {
      unregister = result.current.registerLayer("manual");
    });

    expect(result.current.hasOpenModals).toBe(true);

    act(() => {
      unregister();
    });

    expect(result.current.hasOpenModals).toBe(false);
  });
});
