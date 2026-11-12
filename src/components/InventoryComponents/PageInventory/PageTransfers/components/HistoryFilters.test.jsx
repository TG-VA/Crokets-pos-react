import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import HistoryFilters from "./HistoryFilters";

const defaultProps = {
  dateFrom: null,
  dateTo: null,
  rangePreset: "custom",
  hasActiveFilters: false,
  onDateChange: vi.fn(),
  onRangePreset: vi.fn(),
  onClearFilters: vi.fn(),
};

const getDay = (label) =>
  screen.getByRole("gridcell", { name: new RegExp(label) });

describe("HistoryFilters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deshabilita las fechas posteriores a hoy en Creado hasta", () => {
    render(<HistoryFilters {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Creado hasta"));

    expect(getDay("October 21").getAttribute("aria-disabled")).toBe("false");
    expect(getDay("October 22").getAttribute("aria-disabled")).toBe("true");
  });

  it("deshabilita en Creado desde las fechas futuras cuando no hay dateTo", () => {
    render(<HistoryFilters {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Creado desde"));

    expect(getDay("October 21").getAttribute("aria-disabled")).toBe("false");
    expect(getDay("October 22").getAttribute("aria-disabled")).toBe("true");
  });

  it("deshabilita en Creado desde las fechas posteriores a dateTo", () => {
    render(
      <HistoryFilters
        {...defaultProps}
        dateFrom={new Date(2026, 9, 19)}
        dateTo={new Date(2026, 9, 20)}
      />
    );

    fireEvent.click(screen.getByLabelText("Creado desde"));

    expect(getDay("October 20").getAttribute("aria-disabled")).toBe("false");
    expect(getDay("October 21").getAttribute("aria-disabled")).toBe("true");
    expect(getDay("October 22").getAttribute("aria-disabled")).toBe("true");
  });
});
