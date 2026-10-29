import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import SettingsUsers from "./SettingsUsers";
import styles from "./SettingsUsers.module.css";

const stylesSource = readFileSync(
  join(
    process.cwd(),
    "src/components/SettingsComponents/PageSettings/SettingsUsers/SettingsUsers.module.css"
  ),
  "utf8"
);

const {
  fetchUsers,
  fetchRoles,
  updateUser,
  updateUserStatus,
  createUser,
  updateUserPassword,
} = vi.hoisted(() => ({
  fetchUsers: vi.fn(),
  fetchRoles: vi.fn(),
  updateUser: vi.fn(),
  updateUserStatus: vi.fn(),
  createUser: vi.fn(),
  updateUserPassword: vi.fn(),
}));

vi.mock("./services/usersDataService", () => ({
  fetchUsers,
  fetchRoles,
  updateUser,
  updateUserStatus,
  createUser,
  updateUserPassword,
}));

vi.mock("../../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "current-user" } }),
}));

const ROLES = [
  { id: "role-admin", name: "admin" },
  { id: "role-cashier", name: "cajero" },
];

const USERS = [
  {
    id: "u1",
    name: "Ana Torres",
    username: "ana",
    email: "ana@crokets.test",
    status: true,
    roleId: "role-admin",
    roleName: "admin",
    createdAt: "2026-01-05T10:00:00.000Z",
  },
  {
    id: "u2",
    name: "Luis Ponce",
    username: "luis",
    email: "luis@crokets.test",
    status: false,
    roleId: "role-cashier",
    roleName: "cajero",
    createdAt: "2026-02-10T12:00:00.000Z",
  },
];

const buildCashierUsers = (count) =>
  Array.from({ length: count }, (_, index) => {
    const order = String(index + 1).padStart(2, "0");

    return {
      id: `u${order}`,
      name: `Cajero ${order}`,
      username: `cajero${order}`,
      email: `cajero${order}@crokets.test`,
      status: true,
      roleId: "role-cashier",
      roleName: "cajero",
      createdAt: "2026-03-01T10:00:00.000Z",
    };
  });

const mockAdminsCount = USERS.filter((u) => u.roleName === "admin").length;
const mockCashiersCount = USERS.filter((u) => u.roleName === "cajero").length;

const mockLoadSuccess = () => {
  fetchUsers.mockResolvedValue({ success: true, data: USERS, error: null });
  fetchRoles.mockResolvedValue({ success: true, data: ROLES, error: null });
};

describe("SettingsUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("carga usuarios y roles y muestra KPIs y cabeceras accesibles", async () => {
    mockLoadSuccess();

    render(<SettingsUsers />);

    expect(await screen.findByText("ANA TORRES")).toBeTruthy();
    expect(screen.getByText("@LUIS · luis@crokets.test")).toBeTruthy();

    const kpis = within(
      screen.getByRole("region", { name: "Resumen de usuarios" })
    );
    expect(
      kpis.getByText("Total de usuarios").previousSibling.textContent
    ).toBe("2");
    expect(kpis.getByText("Activos").previousSibling.textContent).toBe("1");
    expect(kpis.getByText("Inactivos").previousSibling.textContent).toBe("1");
    expect(kpis.getByText("Administradores").previousSibling.textContent).toBe(
      String(mockAdminsCount)
    );
    expect(kpis.getByText("Cajeros").previousSibling.textContent).toBe(
      String(mockCashiersCount)
    );

    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((th) => th.textContent)).toEqual([
      "Usuario",
      "Rol",
      "Estado",
      "Registro",
      "Acciones",
    ]);
    headers.forEach((th) => expect(th.getAttribute("scope")).toBe("col"));
  });

  it("filtra los usuarios por termino de busqueda", async () => {
    mockLoadSuccess();

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    fireEvent.change(screen.getByLabelText("Buscar usuario"), {
      target: { value: "luis" },
    });

    expect(screen.queryByText("ANA TORRES")).toBeNull();
    expect(screen.getByText("LUIS PONCE")).toBeTruthy();
  });

  it("recarga la lista al pulsar Recargar", async () => {
    mockLoadSuccess();

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    fetchUsers.mockClear();
    fetchUsers.mockResolvedValue({
      success: true,
      data: [USERS[0]],
      error: null,
    });

    fireEvent.click(screen.getByRole("button", { name: "Recargar" }));

    await waitFor(() => expect(fetchUsers).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("LUIS PONCE")).toBeNull());
  });

  it("muestra el error de carga en un contenedor role=alert", async () => {
    fetchUsers.mockResolvedValue({
      success: false,
      data: [],
      error: "red caida",
    });
    fetchRoles.mockResolvedValue({ success: true, data: ROLES, error: null });

    render(<SettingsUsers />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("red caida");
  });

  it("cambia el estado del usuario desde el modal de confirmacion", async () => {
    mockLoadSuccess();
    updateUserStatus.mockResolvedValue({
      success: true,
      data: null,
      error: null,
    });

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    fireEvent.click(
      screen.getByRole("button", { name: "Desactivar a Ana Torres" })
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Desactivar usuario");
    expect(dialog.textContent).toContain("ANA TORRES");
    expect(dialog.textContent).toContain("@ANA");

    fireEvent.click(screen.getByRole("button", { name: "Desactivar" }));

    await waitFor(() =>
      expect(updateUserStatus).toHaveBeenCalledWith({
        id: "u1",
        status: false,
      })
    );
  });

  it("crea un usuario desde el modal de alta", async () => {
    mockLoadSuccess();
    createUser.mockResolvedValue({
      success: true,
      data: { id: "u3" },
      requiresConfirmation: true,
      error: null,
    });

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    fireEvent.click(screen.getByRole("button", { name: "Nuevo Usuario" }));

    fireEvent.change(screen.getByLabelText("Nombre completo"), {
      target: { value: "Nuevo Cajero" },
    });
    fireEvent.change(screen.getByLabelText("Usuario"), {
      target: { value: "NUEVO" },
    });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "nuevo@crokets.test" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña inicial"), {
      target: { value: "secreto123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), {
      target: { value: "secreto123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Crear usuario" }));

    await waitFor(() =>
      expect(createUser).toHaveBeenCalledWith({
        name: "NUEVO CAJERO",
        username: "nuevo",
        email: "nuevo@crokets.test",
        roleId: "role-cashier",
        password: "secreto123",
      })
    );
  });

  it("marca los campos vacios como invalidos y asocia sus mensajes de error", async () => {
    mockLoadSuccess();

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    fireEvent.click(screen.getByRole("button", { name: "Nuevo Usuario" }));
    fireEvent.click(screen.getByRole("button", { name: "Crear usuario" }));

    const fieldErrors = [
      {
        input: screen.getByLabelText("Nombre completo"),
        inputId: "settings-users-name",
        errorId: "settings-users-name-error",
        message: "El nombre completo es obligatorio.",
      },
      {
        input: screen.getByLabelText("Usuario"),
        inputId: "settings-users-username",
        errorId: "settings-users-username-error",
        message: "El nombre de usuario es obligatorio.",
      },
      {
        input: screen.getByLabelText("Correo electrónico"),
        inputId: "settings-users-email",
        errorId: "settings-users-email-error",
        message: "El correo es obligatorio.",
      },
      {
        input: screen.getByLabelText("Contraseña inicial"),
        inputId: "settings-users-password",
        errorId: "settings-users-password-error",
        message: "La contraseña es obligatoria.",
      },
    ];

    fieldErrors.forEach(({ input, inputId, errorId, message }) => {
      expect(input.getAttribute("id")).toBe(inputId);
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(input.getAttribute("aria-describedby")).toBe(errorId);

      const errorNode = document.getElementById(errorId);
      expect(errorNode).not.toBeNull();
      expect(errorNode.textContent).toBe(message);
    });
  });

  it("convierte a mayusculas el nombre y a minusculas el usuario mientras se escriben", async () => {
    mockLoadSuccess();

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    fireEvent.click(screen.getByRole("button", { name: "Nuevo Usuario" }));

    const nameInput = screen.getByLabelText("Nombre completo");
    const usernameInput = screen.getByLabelText("Usuario");

    fireEvent.change(nameInput, { target: { value: "carlos perez" } });
    fireEvent.change(usernameInput, { target: { value: "CPEREZ" } });

    expect(nameInput.value).toBe("CARLOS PEREZ");
    expect(usernameInput.value).toBe("cperez");
  });

  it("permite editar el usuario y conserva correo e id en solo lectura", async () => {
    mockLoadSuccess();

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    fireEvent.click(
      screen.getByRole("button", { name: "Editar a Ana Torres" })
    );

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("ana@crokets.test")).toBeTruthy();
    expect(within(dialog).getByText("u1")).toBeTruthy();

    const usernameInput = dialog.querySelector("input#settings-users-username");
    expect(usernameInput).not.toBeNull();
    expect(usernameInput.value).toBe("ana");
    expect(dialog.querySelector("input#settings-users-email")).toBeNull();
  });

  it("actualiza datos y contrasena al editar con nueva clave", async () => {
    mockLoadSuccess();
    updateUser.mockResolvedValue({ success: true, data: null, error: null });
    updateUserPassword.mockResolvedValue({
      success: true,
      data: { id: "u1" },
      error: null,
    });

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    fireEvent.click(
      screen.getByRole("button", { name: "Editar a Ana Torres" })
    );

    fireEvent.change(screen.getByLabelText("Nombre completo"), {
      target: { value: "Ana Actualizada" },
    });
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
      target: { value: "nuevaClave1" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar nueva contraseña"), {
      target: { value: "nuevaClave1" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith({
        id: "u1",
        name: "ANA ACTUALIZADA",
        username: "ana",
        roleId: "role-admin",
      })
    );
    await waitFor(() =>
      expect(updateUserPassword).toHaveBeenCalledWith({
        id: "u1",
        password: "nuevaClave1",
      })
    );
  });

  it("permite cambiar el nombre de usuario al editar", async () => {
    mockLoadSuccess();
    updateUser.mockResolvedValue({ success: true, data: null, error: null });

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    fireEvent.click(
      screen.getByRole("button", { name: "Editar a Ana Torres" })
    );

    fireEvent.change(screen.getByLabelText("Usuario"), {
      target: { value: "nueva" },
    });

    expect(screen.getByText("Nombre de usuario válido")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith({
        id: "u1",
        name: "ANA TORRES",
        username: "nueva",
        roleId: "role-admin",
      })
    );
  });

  it("no restablece la contrasena al editar sin nueva clave", async () => {
    mockLoadSuccess();
    updateUser.mockResolvedValue({ success: true, data: null, error: null });

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    fireEvent.click(
      screen.getByRole("button", { name: "Editar a Ana Torres" })
    );

    fireEvent.change(screen.getByLabelText("Nombre completo"), {
      target: { value: "Ana Actualizada" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledTimes(1));
    expect(updateUserPassword).not.toHaveBeenCalled();
  });

  it("restablece el estado de copiado al cerrar el modal", async () => {
    mockLoadSuccess();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    fireEvent.click(
      screen.getByRole("button", { name: "Editar a Ana Torres" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Copiar" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copiado" })).toBeTruthy()
    );
    expect(writeText).toHaveBeenCalledWith("u1");

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Editar a Ana Torres" })
    );

    expect(screen.getByRole("button", { name: "Copiar" })).toBeTruthy();
  });

  it("limpia los filtros activos con el boton Limpiar filtros", async () => {
    mockLoadSuccess();

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    expect(
      screen.queryByRole("button", { name: "Limpiar filtros" })
    ).toBeNull();

    fireEvent.change(screen.getByLabelText("Buscar usuario"), {
      target: { value: "luis" },
    });

    expect(screen.queryByText("ANA TORRES")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(screen.getByLabelText("Buscar usuario").value).toBe("");
    expect(screen.getByText("ANA TORRES")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Limpiar filtros" })
    ).toBeNull();
  });

  it("pagina el listado de usuarios", async () => {
    fetchUsers.mockResolvedValue({
      success: true,
      data: buildCashierUsers(12),
    });
    fetchRoles.mockResolvedValue({ success: true, data: ROLES });

    render(<SettingsUsers />);

    await screen.findByText("CAJERO 01");

    expect(screen.getByText("CAJERO 10")).toBeTruthy();
    expect(screen.queryByText("CAJERO 11")).toBeNull();
    expect(screen.getByText("Mostrando 1 a 10 de 12 usuarios")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText("CAJERO 11")).toBeTruthy();
    expect(screen.queryByText("CAJERO 01")).toBeNull();
    expect(screen.getByText("Mostrando 11 a 12 de 12 usuarios")).toBeTruthy();
  });

  it("muestra los roles del formulario en singular", async () => {
    mockLoadSuccess();

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    fireEvent.click(screen.getByRole("button", { name: "Nuevo Usuario" }));

    const dialog = screen.getByRole("dialog");
    const roleSelect = within(dialog).getByLabelText("Rol");

    expect(
      Array.from(roleSelect.options).map((option) => option.textContent)
    ).toEqual(["Administrador", "Cajero"]);
  });

  it("muestra feedback en vivo de disponibilidad de usuario y correo", async () => {
    mockLoadSuccess();

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    fireEvent.click(screen.getByRole("button", { name: "Nuevo Usuario" }));

    const usernameInput = screen.getByLabelText("Usuario");
    const emailInput = screen.getByLabelText("Correo electrónico");

    fireEvent.change(usernameInput, { target: { value: "nuevo" } });

    expect(screen.getByText("Nombre de usuario válido")).toBeTruthy();
    expect(usernameInput.getAttribute("aria-invalid")).toBeNull();
    expect(usernameInput.className).toContain(styles.fieldValid);

    fireEvent.change(usernameInput, { target: { value: "ana" } });

    expect(screen.getByText("Nombre de usuario no disponible")).toBeTruthy();
    expect(usernameInput.getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(emailInput, { target: { value: "nuevo@crokets.test" } });

    expect(screen.getByText("Correo electrónico válido")).toBeTruthy();

    fireEvent.change(emailInput, { target: { value: "ana@crokets.test" } });

    expect(screen.getByText("Correo electrónico no disponible")).toBeTruthy();

    fireEvent.change(emailInput, { target: { value: "no-es-correo" } });

    expect(screen.getByText("Correo electrónico inválido.")).toBeTruthy();
  });

  it("confirma en verde las contrasenas coincidentes y marca el desajuste", async () => {
    mockLoadSuccess();

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    fireEvent.click(screen.getByRole("button", { name: "Nuevo Usuario" }));

    const passwordInput = screen.getByLabelText("Contraseña inicial");
    const confirmInput = screen.getByLabelText("Confirmar contraseña");

    fireEvent.change(passwordInput, { target: { value: "secreto123" } });
    fireEvent.change(confirmInput, { target: { value: "secreto123" } });

    expect(screen.getByText("Las contraseñas coinciden")).toBeTruthy();
    expect(confirmInput.className).toContain(styles.fieldValid);

    fireEvent.change(confirmInput, { target: { value: "otraClave1" } });

    expect(screen.queryByText("Las contraseñas coinciden")).toBeNull();
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeTruthy();
  });

  it("aplica las clases de estilo a los iconos de los botones", async () => {
    mockLoadSuccess();

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    const reloadButton = screen.getByRole("button", { name: "Recargar" });
    const newUserButton = screen.getByRole("button", { name: "Nuevo Usuario" });

    expect(reloadButton.className).toContain(styles.secondaryButton);
    expect(newUserButton.className).toContain(styles.primaryButton);

    const reloadIcon = reloadButton.querySelector("img");
    const newUserIcon = newUserButton.querySelector("img");

    expect(reloadIcon.className).toBe(styles.buttonIcon);
    expect(newUserIcon.className).toBe(styles.buttonIcon);

    fireEvent.change(screen.getByLabelText("Buscar usuario"), {
      target: { value: "luis" },
    });

    const clearFiltersButton = screen.getByRole("button", {
      name: "Limpiar filtros",
    });

    expect(clearFiltersButton.className).toContain(styles.secondaryButton);
    expect(clearFiltersButton.querySelector("img").className).toBe(
      styles.buttonIcon
    );
  });

  it("define los filtros de color de los iconos de accion", () => {
    expect(stylesSource).toContain(".primaryButton .buttonIcon");
    expect(stylesSource).toContain(".secondaryButton .buttonIcon");
    expect(stylesSource).toContain("brightness(0) invert(1)");
    expect(stylesSource).toContain(
      "invert(31%) sepia(58%) saturate(1242%) hue-rotate(157deg)"
    );
  });

  it("alterna la visibilidad de la contrasena y su confirmacion", async () => {
    mockLoadSuccess();

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    fireEvent.click(screen.getByRole("button", { name: "Nuevo Usuario" }));

    const passwordInput = screen.getByLabelText("Contraseña inicial");
    const passwordWrapper = passwordInput.parentElement;

    expect(passwordInput.getAttribute("type")).toBe("password");

    fireEvent.click(
      within(passwordWrapper).getByRole("button", {
        name: "Mostrar contraseña",
      })
    );

    expect(passwordInput.getAttribute("type")).toBe("text");
    expect(
      within(passwordWrapper).getByRole("button", {
        name: "Ocultar contraseña",
      })
    ).toBeTruthy();

    const confirmInput = screen.getByLabelText("Confirmar contraseña");
    const confirmWrapper = confirmInput.parentElement;

    expect(confirmInput.getAttribute("type")).toBe("password");

    fireEvent.click(
      within(confirmWrapper).getByRole("button", {
        name: "Mostrar contraseña",
      })
    );

    expect(confirmInput.getAttribute("type")).toBe("text");
    expect(passwordInput.getAttribute("type")).toBe("text");
  });

  it("muestra el boton Limpiar filtros en el estado vacio de la tabla", async () => {
    mockLoadSuccess();

    render(<SettingsUsers />);

    await screen.findByText("ANA TORRES");

    expect(screen.queryByText("Sin resultados")).toBeNull();

    fireEvent.change(screen.getByLabelText("Buscar usuario"), {
      target: { value: "zzz" },
    });

    const emptyState = screen.getByText("Sin resultados").closest("div");

    fireEvent.click(
      within(emptyState).getByRole("button", { name: "Limpiar filtros" })
    );

    expect(screen.getByLabelText("Buscar usuario").value).toBe("");
    expect(screen.getByText("ANA TORRES")).toBeTruthy();
  });
});
