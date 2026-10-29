import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";

import useSalesModals from "./useSalesModals";
import {
  ModalStackProvider,
  useModalStack,
} from "../../../contexts/ModalStackContext";

const wrapper = ({ children }) => (
  <ModalStackProvider>{children}</ModalStackProvider>
);

const renderModals = () =>
  renderHook(() => ({ modals: useSalesModals(), stack: useModalStack() }), {
    wrapper,
  });

// Cada modal de Ventas, por el setter publico que lo abre.
const MODAL_OPENERS = [
  ["setExitModalOpen", true],
  ["setExitAuthModalOpen", true],
  ["setEntryModalOpen", true],
  ["setShowPaymentModal", true],
  ["setClientModalOpen", true],
  ["setVerifierModalOpen", true],
  ["setSearchModalOpen", true],
  ["setDiscountModalOpen", true],
  ["setPendingModalOpen", true],
  ["setChangeModalOpen", true],
  ["setDeleteModalOpen", true],
  ["setDeleteItemModalOpen", true],
  ["setSalesHistoryModalOpen", true],
  ["setSaleSuccessData", { id: "s1" }],
  ["setRewardProductModalOpen", true],
  ["setProductDiscountRewardModalOpen", true],
];

describe("useSalesModals: capas en la pila de modales", () => {
  it("no registra capas cuando no hay modales abiertos", () => {
    const { result } = renderModals();

    expect(result.current.stack.hasOpenModals).toBe(false);
  });

  it.each(MODAL_OPENERS)(
    "%s abre una capa y la libera al cerrarse",
    (setter, openValue) => {
      const { result } = renderModals();

      act(() => result.current.modals[setter](openValue));
      expect(result.current.stack.hasOpenModals).toBe(true);

      act(() =>
        result.current.modals[setter](
          setter === "setSaleSuccessData" ? null : false
        )
      );
      expect(result.current.stack.hasOpenModals).toBe(false);
    }
  );
});
