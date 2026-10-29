import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotesModal from "./NotesModal";

describe("NotesModal: botones de cierre", () => {
  it("no muestra la X y conserva Cancelar y Guardar Notas", () => {
    render(<NotesModal isOpen onClose={() => {}} onSave={() => {}} />);

    expect(screen.queryByRole("button", { name: "Cerrar modal" })).toBeNull();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar Notas" })).toBeTruthy();
  });
});
