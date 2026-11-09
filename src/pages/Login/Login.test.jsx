import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import Login from "./Login";

const tableResults = {
  users: { data: { id: "u1", username: "carlos" }, error: null },
  branches: { data: { id: "b1", name: "Coba" }, error: null },
  user_sessions: { data: { user_id: "u1" }, error: null },
};

vi.mock("../../lib/supabaseClient", () => {
  const buildChain = (table) => {
    const chain = {};
    ["select", "ilike", "eq", "is"].forEach((method) => {
      chain[method] = () => chain;
    });
    chain.maybeSingle = () => Promise.resolve(tableResults[table]);
    chain.single = () => Promise.resolve(tableResults[table]);
    return chain;
  };

  return {
    supabase: {
      rpc: () => Promise.resolve({ data: "carlos@example.com", error: null }),
      from: buildChain,
      auth: {
        signInWithPassword: () =>
          Promise.resolve({ data: { user: { id: "u1" } }, error: null }),
      },
    },
  };
});

vi.mock("../../services/deviceBranchService", () => ({
  resolveBranchByDevice: () =>
    Promise.resolve({ success: true, data: { id: "b1" } }),
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ login: vi.fn(), unlockScreen: vi.fn() }),
}));

vi.mock("../../contexts/BranchContext", () => ({
  useBranch: () => ({ setBranch: vi.fn() }),
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("../CashRegister/CashRegister", () => ({ default: () => null }));
vi.mock("../Dashboard/Dashboard", () => ({ default: () => null }));
vi.mock("../../components/DeviceActivationModal/DeviceActivationModal", () => ({
  default: () => null,
}));

const renderLogin = async () => {
  const view = render(<Login />);
  const username = screen.getByLabelText("Usuario");
  const password = screen.getByLabelText("Contraseña");

  // El foco inicial llega con un temporizador: se espera antes de probar.
  await waitFor(() => expect(document.activeElement).toBe(username));

  return { ...view, username, password };
};

describe("Login: Enter en el campo usuario", () => {
  it("pasa el foco a la contrasena sin mostrar error", async () => {
    const { username, password } = await renderLogin();
    fireEvent.change(username, { target: { value: "carlos" } });

    const notPrevented = fireEvent.keyDown(username, { key: "Enter" });

    expect(notPrevented).toBe(false);
    expect(document.activeElement).toBe(password);
    expect(screen.queryByText("Por favor, complete todos los campos.")).toBe(
      null
    );
  });

  it("no intercepta Enter si el usuario esta vacio", async () => {
    const { username } = await renderLogin();

    const notPrevented = fireEvent.keyDown(username, { key: "Enter" });

    expect(notPrevented).toBe(true);
    expect(document.activeElement).toBe(username);
  });
});

describe("Login: foco tras enviar el formulario", () => {
  beforeEach(() => {
    window.electronAPI = {
      invoke: vi.fn().mockResolvedValue({ deviceCode: "D1" }),
    };
  });

  it("enfoca el usuario si falta el usuario", async () => {
    const { container, username, password } = await renderLogin();
    password.focus();

    fireEvent.submit(container.querySelector("form"));

    expect(
      screen.getByText("Por favor, complete todos los campos.")
    ).toBeTruthy();
    expect(document.activeElement).toBe(username);
  });

  it("enfoca la contrasena si solo falta la contrasena", async () => {
    const { container, username, password } = await renderLogin();
    fireEvent.change(username, { target: { value: "carlos" } });

    fireEvent.submit(container.querySelector("form"));

    expect(document.activeElement).toBe(password);
  });

  it("enfoca Recuperar sesion cuando hay una sesion recuperable", async () => {
    const { container, username, password } = await renderLogin();
    fireEvent.change(username, { target: { value: "carlos" } });
    fireEvent.change(password, { target: { value: "secreto" } });

    fireEvent.submit(container.querySelector("form"));

    const recoverButton = await screen.findByRole("button", {
      name: "Recuperar sesión",
    });
    await waitFor(() => expect(document.activeElement).toBe(recoverButton));
  });
});
