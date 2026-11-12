import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import KitFormSection from "./KitFormSection";

const baseForm = {
  barcode: "",
  description: "",
  price: "",
  max_kits_per_sale: "1",
  starts_on: "",
  ends_on: "",
  no_starts_on: false,
  no_ends_on: false,
};

const typeEndDate = (formOverrides, typed) => {
  const updateField = vi.fn();
  render(
    <KitFormSection
      form={{ ...baseForm, ...formOverrides }}
      updateField={updateField}
      barcodeInputRef={{ current: null }}
      selectedProductsTotal={0}
      kitPrice={0}
      kitDiscount={0}
      kitDiscountPercent={0}
      kitMarginWarning={null}
      onOpenSearch={vi.fn()}
    />
  );
  const [, endInput] = screen.getAllByPlaceholderText("Sin límite");
  fireEvent.change(endInput, { target: { value: typed } });
  return updateField.mock.calls
    .filter(([field]) => field === "ends_on")
    .map(([, value]) => value);
};

// La fecha minima de fin depende de hoy; el reloj se congela.
describe("KitFormSection fecha minima de fin", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-10T18:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("descarta un fin anterior a hoy", () => {
    expect(typeEndDate({}, "05/11/2026")).not.toContain("2026-11-05");
  });

  it("descarta un fin anterior a un inicio futuro", () => {
    expect(
      typeEndDate({ starts_on: "2026-12-01" }, "20/11/2026")
    ).not.toContain("2026-11-20");
  });

  it("acepta un fin posterior al inicio futuro", () => {
    expect(typeEndDate({ starts_on: "2026-12-01" }, "05/12/2026")).toContain(
      "2026-12-05"
    );
  });
});
