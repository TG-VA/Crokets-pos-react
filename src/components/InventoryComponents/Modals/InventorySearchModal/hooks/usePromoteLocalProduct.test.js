import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ promote: vi.fn() }));

vi.mock(
  "../../../PageInventory/PageOrders/services/promoteProductToGlobalService",
  () => ({ promoteProductToGlobal: mocks.promote })
);

import usePromoteLocalProduct from "./usePromoteLocalProduct";

describe("usePromoteLocalProduct", () => {
  beforeEach(() => {
    mocks.promote.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("promueve el producto, llama onSuccess y limpia el error", async () => {
    mocks.promote.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => usePromoteLocalProduct({ onSuccess }));

    await act(async () => {
      await result.current.promote("p1");
    });

    expect(mocks.promote).toHaveBeenCalledWith("p1");
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.saving).toBe(false);
  });

  it("expone el mensaje de error y no llama onSuccess si falla", async () => {
    mocks.promote.mockRejectedValue(new Error("Solo un administrador."));
    const onSuccess = vi.fn();
    const { result } = renderHook(() => usePromoteLocalProduct({ onSuccess }));

    await act(async () => {
      await result.current.promote("p1");
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Solo un administrador.");
    expect(result.current.saving).toBe(false);
  });
});
