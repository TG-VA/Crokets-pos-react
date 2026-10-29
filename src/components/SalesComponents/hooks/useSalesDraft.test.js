import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import useSalesDraft from "./useSalesDraft";

const DRAFT_KEY = "sales_draft_b1_u1";

const buildDraft = (overrides = {}) => ({
  version: 1,
  savedAt: "2026-01-01T10:00:00.000Z",
  branchId: "b1",
  userId: "u1",
  productos: [{ id: "p1", cantidad: 1 }],
  currentSaleClient: { id: "c1", name: "Ana" },
  currentSaleReward: null,
  ticketNumber: 4,
  saleToken: "token-1",
  saleNotes: "",
  barcode: "",
  pendingTickets: [],
  subtotal: 10,
  discountTotal: 0,
  total: 10,
  ...overrides,
});

const renderDraft = (callbacks = {}) =>
  renderHook(() =>
    useSalesDraft({
      branchId: "b1",
      userId: "u1",
      productos: [],
      pendingTickets: [],
      currentSaleClient: null,
      currentSaleReward: null,
      ticketNumber: 1,
      saleToken: null,
      saleNotes: "",
      barcode: "",
      subtotal: 0,
      discountTotal: 0,
      total: 0,
      ...callbacks,
    })
  );

describe("useSalesDraft: restauracion al montar", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("restaura el borrador existente en la primera pasada", async () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(buildDraft()));
    const onRestoreDraft = vi.fn();
    const onOpenRecoveryModal = vi.fn();

    const { result } = renderDraft({ onRestoreDraft, onOpenRecoveryModal });

    await waitFor(() => expect(result.current.draftReady).toBe(true));

    expect(onRestoreDraft).toHaveBeenCalledWith(
      expect.objectContaining({ saleToken: "token-1" })
    );
    expect(onOpenRecoveryModal).toHaveBeenCalledTimes(1);
    expect(result.current.recoveredDraft).toBe(true);
  });

  it("no abre recuperacion cuando la sesion ya estaba activa", async () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(buildDraft()));
    sessionStorage.setItem(`${DRAFT_KEY}_session_alive`, "true");
    const onRestoreDraft = vi.fn();
    const onOpenRecoveryModal = vi.fn();

    const { result } = renderDraft({ onRestoreDraft, onOpenRecoveryModal });

    await waitFor(() => expect(result.current.draftReady).toBe(true));
    expect(onRestoreDraft).toHaveBeenCalledTimes(1);
    expect(onOpenRecoveryModal).not.toHaveBeenCalled();
    expect(result.current.recoveredDraft).toBe(false);
  });

  it("queda listo sin borrador y no abre recuperacion", async () => {
    const onRestoreDraft = vi.fn();
    const onOpenRecoveryModal = vi.fn();

    const { result } = renderDraft({ onRestoreDraft, onOpenRecoveryModal });

    await waitFor(() => expect(result.current.draftReady).toBe(true));
    expect(onRestoreDraft).not.toHaveBeenCalled();
    expect(onOpenRecoveryModal).not.toHaveBeenCalled();
  });
});
