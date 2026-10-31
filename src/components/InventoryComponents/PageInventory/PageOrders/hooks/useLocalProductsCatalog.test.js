import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLocalProductsCatalog } from "./useLocalProductsCatalog";

const { fetchLocalProductsCatalog } = vi.hoisted(() => ({
  fetchLocalProductsCatalog: vi.fn(),
}));

vi.mock("../services/localProductsCatalogService", () => ({
  fetchLocalProductsCatalog,
}));

describe("useLocalProductsCatalog", () => {
  beforeEach(() => {
    fetchLocalProductsCatalog.mockReset();
  });

  it("carga los productos locales al montar", async () => {
    fetchLocalProductsCatalog.mockResolvedValue([{ id: "a" }]);

    const { result } = renderHook(() => useLocalProductsCatalog());

    await waitFor(() => expect(result.current.localProducts).toHaveLength(1));
  });

  it("reload vuelve a consultar y refleja el catalogo actualizado", async () => {
    fetchLocalProductsCatalog
      .mockResolvedValueOnce([{ id: "a" }, { id: "b" }])
      .mockResolvedValueOnce([{ id: "b" }]);

    const { result } = renderHook(() => useLocalProductsCatalog());
    await waitFor(() => expect(result.current.localProducts).toHaveLength(2));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.localProducts).toHaveLength(1));
    expect(fetchLocalProductsCatalog).toHaveBeenCalledTimes(2);
  });
});
