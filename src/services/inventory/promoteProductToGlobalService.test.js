import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ result: { data: null, error: null } }));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn(() => Promise.resolve(mocks.result)) },
}));

import { supabase } from "../../lib/supabaseClient";
import { promoteProductToGlobal } from "./promoteProductToGlobalService";

describe("promoteProductToGlobal", () => {
  beforeEach(() => {
    mocks.result = { data: { success: true, product_id: "p1" }, error: null };
  });

  it("llama al RPC con el id del producto y resuelve en exito", async () => {
    await expect(promoteProductToGlobal("p1")).resolves.toEqual({
      success: true,
      product_id: "p1",
    });
    expect(supabase.rpc).toHaveBeenCalledWith("promote_product_to_global", {
      p_product_id: "p1",
    });
  });

  it("lanza el mensaje del RPC cuando success es false", async () => {
    mocks.result = {
      data: {
        success: false,
        code: "FORBIDDEN",
        message: "Solo un administrador puede hacerlo.",
      },
      error: null,
    };

    await expect(promoteProductToGlobal("p1")).rejects.toThrow(
      "Solo un administrador puede hacerlo."
    );
  });

  it("propaga el error de transporte", async () => {
    mocks.result = { data: null, error: new Error("red caida") };

    await expect(promoteProductToGlobal("p1")).rejects.toThrow("red caida");
  });
});
