import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import KitRenewValidityForm from "./KitRenewValidityForm";

const submitEndDate = (kit, typed) => {
  const onSubmit = vi.fn();
  render(
    <KitRenewValidityForm kit={kit} onSubmit={onSubmit} onCancel={vi.fn()} />
  );
  fireEvent.change(screen.getByLabelText("Nueva fecha de fin"), {
    target: { value: typed },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar vigencia" }));
  return onSubmit.mock.calls[0][1].ends_on;
};

// La fecha minima de fin depende de hoy; el reloj se congela.
describe("KitRenewValidityForm fecha minima de fin", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-10T18:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("descarta un fin anterior a hoy", () => {
    const kit = { starts_on: null, ends_on: null };
    expect(submitEndDate(kit, "05/11/2026")).toBeNull();
  });

  it("descarta un fin anterior a un inicio futuro", () => {
    const kit = { starts_on: "2026-12-01", ends_on: null };
    expect(submitEndDate(kit, "20/11/2026")).toBeNull();
  });

  it("acepta un fin posterior al inicio futuro", () => {
    const kit = { starts_on: "2026-12-01", ends_on: null };
    expect(submitEndDate(kit, "05/12/2026")).toBe("2026-12-05");
  });
});
