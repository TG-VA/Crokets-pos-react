import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

/*
  Contrato del aviso de actualizacion del footer: la version instalada es
  discreta, el aviso de reinicio solo aparece cuando la actualizacion esta
  descargada y el boton delega el reinicio al hook.
*/

const { useAppUpdater, installUpdate } = vi.hoisted(() => ({
  useAppUpdater: vi.fn(),
  installUpdate: vi.fn(),
}));

vi.mock("../../hooks/useAppUpdater", () => ({ default: useAppUpdater }));

import Footer from "./Footer";

const mockUpdater = (overrides = {}) => {
  useAppUpdater.mockReturnValue({
    appVersion: "1.0.0",
    updateReady: false,
    newVersion: null,
    installUpdate,
    ...overrides,
  });
};

describe("Footer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdater();
  });

  it("muestra la version instalada", () => {
    render(<Footer />);

    expect(screen.getByText("v1.0.0")).toBeTruthy();
  });

  it("oculta la version cuando aun no se conoce", () => {
    mockUpdater({ appVersion: null });

    render(<Footer />);

    expect(screen.queryByText(/^v\d/)).toBeNull();
  });

  it("no muestra el aviso mientras no hay actualizacion descargada", () => {
    render(<Footer />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("muestra el aviso con la version nueva lista", () => {
    mockUpdater({ updateReady: true, newVersion: "1.0.1" });

    render(<Footer />);

    expect(screen.getByRole("button").textContent).toContain(
      "Actualización v1.0.1 lista (Reiniciar)"
    );
  });

  it("usa un aviso generico cuando la version nueva es desconocida", () => {
    mockUpdater({ updateReady: true, newVersion: null });

    render(<Footer />);

    expect(screen.getByRole("button").textContent).toContain(
      "Actualización lista (Reiniciar)"
    );
  });

  it("al pulsar el aviso delega el reinicio al hook", () => {
    mockUpdater({ updateReady: true, newVersion: "1.0.1" });

    render(<Footer />);
    fireEvent.click(screen.getByRole("button"));

    expect(installUpdate).toHaveBeenCalledTimes(1);
  });
});
