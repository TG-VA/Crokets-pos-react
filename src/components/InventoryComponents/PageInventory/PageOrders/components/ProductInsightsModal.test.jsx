import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../hooks/useProductInsightsDetail", () => ({
  useProductInsightsDetail: () => ({
    preset: "week",
    dateFrom: new Date(2026, 9, 26),
    dateTo: new Date(2026, 10, 1),
    rows: [],
    totals: { stock: 0, unitsSold: 0, redeemedUnits: 0, revenue: 0 },
    isLoading: false,
    isRangeValid: true,
    error: "",
    selectPreset: () => {},
    changeDate: () => {},
  }),
}));

import ProductInsightsModal from "./ProductInsightsModal";

const product = {
  productId: "p1",
  productName: "NUPEC ADULTO 2 KG",
  barcode: "7503008553200",
};

describe("ProductInsightsModal sucursal destino", () => {
  it("muestra a que sucursal se envia el producto junto al codigo", () => {
    render(
      <ProductInsightsModal
        product={product}
        destinationBranchName="Sucursal Norte"
        onClose={() => {}}
      />
    );

    expect(screen.getByText("7503008553200")).toBeTruthy();
    expect(screen.getByText("SUCURSAL NORTE")).toBeTruthy();
    expect(screen.getByText("Destino")).toBeTruthy();
  });

  it("omite el badge cuando no hay sucursal destino", () => {
    render(<ProductInsightsModal product={product} onClose={() => {}} />);

    expect(screen.queryByText("Destino")).toBeNull();
  });
});
