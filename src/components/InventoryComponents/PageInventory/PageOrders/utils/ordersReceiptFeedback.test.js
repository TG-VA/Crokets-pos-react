import { describe, it, expect } from "vitest";

import { buildReceiptFeedback } from "./ordersReceiptFeedback";

describe("buildReceiptFeedback", () => {
  it("informa exito cuando no hay diferencias", () => {
    const feedback = buildReceiptFeedback({
      orderNumber: "PED-1",
      items: [{ differenceQty: 0 }, { differenceQty: null }],
    });

    expect(feedback.tone).toBe("success");
    expect(feedback.message).toContain("PED-1 recibido correctamente");
  });

  it("solo cuenta los productos con diferencia", () => {
    const feedback = buildReceiptFeedback({
      orderNumber: "PED-2",
      items: [
        { differenceQty: -1 },
        { differenceQty: 2 },
        { differenceQty: 0 },
      ],
    });

    expect(feedback.tone).toBe("warning");
    expect(feedback.message).toBe(
      "Pedido PED-2 recibido con 2 productos con diferencia."
    );
  });

  it("usa singular con una sola diferencia", () => {
    const feedback = buildReceiptFeedback({
      orderNumber: "PED-3",
      items: [{ differenceQty: -1 }],
    });

    expect(feedback.message).toBe(
      "Pedido PED-3 recibido con 1 producto con diferencia."
    );
  });
});
