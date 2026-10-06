import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsUsers from "./SettingsUsers";

const { fetchProfilesUsers } = vi.hoisted(() => ({
  fetchProfilesUsers: vi.fn(),
}));

vi.mock("../../../../pages/Profiles/services/profilesUsersService", () => ({
  fetchProfilesUsers,
}));

const USERS = [
  {
    id: "u1",
    username: "ana",
    email: "ana@crokets.test",
    status: true,
    roleName: "admin",
    createdAt: "2026-01-05T10:00:00.000Z",
  },
  {
    id: "u2",
    username: "luis",
    email: "luis@crokets.test",
    status: false,
    roleName: "cajero",
    createdAt: "2026-02-10T12:00:00.000Z",
  },
];

describe("SettingsUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("carga los usuarios y renderiza una tabla con cabeceras scope=col", async () => {
    fetchProfilesUsers.mockResolvedValue(USERS);

    render(<SettingsUsers />);

    expect(await screen.findByText("ana")).toBeTruthy();

    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((th) => th.textContent)).toEqual([
      "Usuario",
      "Correo",
      "Rol / Estado",
      "Fecha de Creación",
    ]);
    headers.forEach((th) => expect(th.getAttribute("scope")).toBe("col"));

    expect(screen.getByText("luis@crokets.test")).toBeTruthy();
    expect(screen.getByText("admin")).toBeTruthy();
    expect(screen.getByText("INACTIVO")).toBeTruthy();
  });

  it("recarga la lista al pulsar Recargar", async () => {
    fetchProfilesUsers.mockResolvedValue(USERS);

    render(<SettingsUsers />);

    await screen.findByText("ana");

    fetchProfilesUsers.mockClear();
    fetchProfilesUsers.mockResolvedValue([USERS[0]]);

    fireEvent.click(screen.getByRole("button", { name: "Recargar" }));

    await waitFor(() => expect(fetchProfilesUsers).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("luis@crokets.test")).toBeNull();
  });

  it("anuncia el error de carga con role=alert", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    fetchProfilesUsers.mockRejectedValue(new Error("red caida"));

    render(<SettingsUsers />);

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
