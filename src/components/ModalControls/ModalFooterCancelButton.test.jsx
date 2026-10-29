import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ModalFooterCancelButton from "./ModalFooterCancelButton";

describe("ModalFooterCancelButton", () => {
  it("muestra solo la palabra Cancelar sin el texto de la tecla", () => {
    render(<ModalFooterCancelButton onClick={() => {}} />);

    expect(screen.getByRole("button").textContent).toBe("Cancelar");
  });
});
