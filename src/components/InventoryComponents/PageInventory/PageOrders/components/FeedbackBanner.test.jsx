import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FeedbackBanner from "./FeedbackBanner";

describe("FeedbackBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("se cierra solo a los 8 segundos en avisos informativos", () => {
    const onDismiss = vi.fn();

    render(
      <FeedbackBanner
        feedback={{ tone: "success", message: "Pedido enviado" }}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText("Pedido enviado")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(7999);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("los errores no se cierran solos", () => {
    const onDismiss = vi.fn();

    render(
      <FeedbackBanner
        feedback={{ tone: "error", message: "Fallo" }}
        onDismiss={onDismiss}
      />
    );

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("no renderiza nada sin mensaje", () => {
    const { container } = render(<FeedbackBanner feedback={null} />);

    expect(container.firstChild).toBeNull();
  });
});
