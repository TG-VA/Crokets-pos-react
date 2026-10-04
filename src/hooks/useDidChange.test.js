import { useState } from "react";
import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useDidChange } from "./useDidChange";

describe("useDidChange", () => {
  it("no reajusta nada en el primer render", () => {
    const reset = vi.fn();

    const { result } = renderHook(() => {
      const changed = useDidChange("a");
      if (changed) reset();
      return changed;
    });

    expect(reset).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it("reajusta exactamente una vez por cambio de clave", () => {
    const reset = vi.fn();

    const { rerender } = renderHook(
      ({ key }) => {
        const changed = useDidChange(key);
        if (changed) reset();
        return changed;
      },
      { initialProps: { key: "a" } }
    );

    rerender({ key: "a" });
    expect(reset).not.toHaveBeenCalled();

    rerender({ key: "b" });
    expect(reset).toHaveBeenCalledTimes(1);

    rerender({ key: "b" });
    expect(reset).toHaveBeenCalledTimes(1);

    rerender({ key: "c" });
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it("detecta alternancia entre valores truthy y falsy", () => {
    const reset = vi.fn();

    const { rerender } = renderHook(
      ({ open }) => {
        const changed = useDidChange(open);
        if (changed) reset();
        return changed;
      },
      { initialProps: { open: false } }
    );

    rerender({ open: true });
    expect(reset).toHaveBeenCalledTimes(1);

    rerender({ open: false });
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it("expone el estado ya reajustado tras el cambio de clave", () => {
    const { result, rerender } = renderHook(
      ({ key }) => {
        const [items, setItems] = useState(["previo"]);
        if (useDidChange(key)) {
          setItems(["nuevo"]);
        }
        return items;
      },
      { initialProps: { key: "a" } }
    );

    expect(result.current).toEqual(["previo"]);

    rerender({ key: "b" });
    expect(result.current).toEqual(["nuevo"]);

    rerender({ key: "b" });
    expect(result.current).toEqual(["nuevo"]);
  });

  it("aplica todos los reajustes del bloque en una sola pasada confirmada", () => {
    const { result, rerender } = renderHook(
      ({ key }) => {
        const [a, setA] = useState("x");
        const [b, setB] = useState("y");
        if (useDidChange(key)) {
          setA("a2");
          setB("b2");
        }
        return `${a}|${b}`;
      },
      { initialProps: { key: "a" } }
    );

    expect(result.current).toBe("x|y");

    // Ambas actualizaciones se confirman juntas: no queda estado a medias.
    rerender({ key: "b" });
    expect(result.current).toBe("a2|b2");
  });

  it("mantiene un numero acotado de renders (no entra en ciclo)", () => {
    let renders = 0;

    const { rerender } = renderHook(
      ({ key }) => {
        renders += 1;
        const [n, setN] = useState(0);
        if (useDidChange(key)) {
          setN(1);
        }
        return n;
      },
      { initialProps: { key: "a" } }
    );

    expect(renders).toBe(1);

    rerender({ key: "b" });
    // El ajuste durante el render hace que React descarte la salida y vuelva a
    // ejecutar el componente, por lo que el cambio consume dos invocaciones
    // (una descartada y la confirmada) en lugar de un render confirmado extra
    // disparado por un efecto.
    expect(renders).toBe(3);

    rerender({ key: "b" });
    expect(renders).toBe(4);
  });
});
