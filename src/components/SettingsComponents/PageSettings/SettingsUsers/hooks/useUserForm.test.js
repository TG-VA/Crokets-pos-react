import { describe, it, expect, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useUserForm, {
  EMAIL_AVAILABLE_MESSAGE,
  EMAIL_TAKEN_MESSAGE,
  NAME_MAX_LENGTH,
  PASSWORD_MATCH_MESSAGE,
  USERNAME_AVAILABLE_MESSAGE,
  USERNAME_MAX_LENGTH,
  USERNAME_TAKEN_MESSAGE,
  USER_FORM_CREATE,
  USER_FORM_EDIT,
  validateUserForm,
} from "./useUserForm";

const USERS_FIXTURE = {
  id: "u1",
  name: "Ana Torres",
  username: "ana",
  email: "ana@crokets.test",
  roleName: "admin",
};

describe("validateUserForm", () => {
  it("exige todos los campos al crear", () => {
    const errors = validateUserForm(
      {
        name: "",
        username: "",
        email: "",
        role: "",
        password: "",
        confirmPassword: "",
      },
      USER_FORM_CREATE
    );

    expect(errors.name).toBeTruthy();
    expect(errors.username).toBeTruthy();
    expect(errors.email).toBeTruthy();
    expect(errors.password).toBeTruthy();
  });

  it("valida el formato de usuario y correo al crear", () => {
    const errors = validateUserForm(
      {
        name: "Nuevo Cajero",
        username: "usuario con espacios",
        email: "no-es-correo",
        role: "cajero",
        password: "secreto123",
        confirmPassword: "secreto123",
      },
      USER_FORM_CREATE
    );

    expect(errors.username).toBeTruthy();
    expect(errors.email).toBeTruthy();
  });

  it("exige coincidencia de contrasena al crear", () => {
    const errors = validateUserForm(
      {
        name: "Nuevo Cajero",
        username: "nuevo",
        email: "nuevo@crokets.test",
        role: "cajero",
        password: "secreto123",
        confirmPassword: "otraClave1",
      },
      USER_FORM_CREATE
    );

    expect(errors.confirmPassword).toBe("Las contraseñas no coinciden.");
  });

  it("marca usuario y correo ya registrados como no disponibles", () => {
    const errors = validateUserForm(
      {
        name: "Nuevo Cajero",
        username: "ana",
        email: "ana@crokets.test",
        role: "cajero",
        password: "secreto123",
        confirmPassword: "secreto123",
      },
      USER_FORM_CREATE,
      [{ id: "u1", username: "Ana", email: "ANA@crokets.test" }]
    );

    expect(errors.username).toBe(USERNAME_TAKEN_MESSAGE);
    expect(errors.email).toBe(EMAIL_TAKEN_MESSAGE);
  });

  it("no reporta error cuando usuario y correo estan disponibles", () => {
    const errors = validateUserForm(
      {
        name: "Nuevo Cajero",
        username: "nuevo",
        email: "nuevo@crokets.test",
        role: "cajero",
        password: "secreto123",
        confirmPassword: "secreto123",
      },
      USER_FORM_CREATE,
      [{ id: "u1", username: "ana", email: "ana@crokets.test" }]
    );

    expect(errors.username).toBeUndefined();
    expect(errors.email).toBeUndefined();
  });

  it("limita la longitud maxima del nombre y del usuario", () => {
    const errors = validateUserForm(
      {
        name: "a".repeat(NAME_MAX_LENGTH + 1),
        username: "u".repeat(USERNAME_MAX_LENGTH + 1),
        email: "nuevo@crokets.test",
        role: "cajero",
        password: "secreto123",
        confirmPassword: "secreto123",
      },
      USER_FORM_CREATE
    );

    expect(errors.name).toBe(
      `El nombre no puede superar los ${NAME_MAX_LENGTH} caracteres.`
    );
    expect(errors.username).toBe(
      `No puede superar los ${USERNAME_MAX_LENGTH} caracteres.`
    );
  });

  it("acepta valores justo en el limite permitido", () => {
    const errors = validateUserForm(
      {
        name: "a".repeat(NAME_MAX_LENGTH),
        username: "u".repeat(USERNAME_MAX_LENGTH),
        email: "nuevo@crokets.test",
        role: "cajero",
        password: "secreto123",
        confirmPassword: "secreto123",
      },
      USER_FORM_CREATE
    );

    expect(errors.name).toBeUndefined();
    expect(errors.username).toBeUndefined();
  });

  it("no exige contrasena al editar si queda en blanco", () => {
    const errors = validateUserForm(
      { name: "Ana", role: "admin", password: "", confirmPassword: "" },
      USER_FORM_EDIT
    );

    expect(errors.password).toBeUndefined();
    expect(errors.confirmPassword).toBeUndefined();
  });

  it("valida minimo y coincidencia de contrasena al editar con valor", () => {
    const tooShort = validateUserForm(
      { name: "Ana", role: "admin", password: "123", confirmPassword: "123" },
      USER_FORM_EDIT
    );
    expect(tooShort.password).toBe("Debe tener al menos 6 caracteres.");

    const mismatch = validateUserForm(
      {
        name: "Ana",
        role: "admin",
        password: "nuevaClave1",
        confirmPassword: "nuevaClave2",
      },
      USER_FORM_EDIT
    );
    expect(mismatch.confirmPassword).toBe("Las contraseñas no coinciden.");
  });

  it("exige la contrasena al editar cuando solo se llena la confirmacion", () => {
    const errors = validateUserForm(
      {
        name: "Ana",
        role: "admin",
        password: "",
        confirmPassword: "nuevaClave1",
      },
      USER_FORM_EDIT
    );

    expect(errors.password).toBeTruthy();
    expect(errors.confirmPassword).toBe("Las contraseñas no coinciden.");
  });

  it("valida el username en edicion contra el catalogo excluyendo al propio usuario", () => {
    const base = {
      name: "Ana",
      role: "admin",
      password: "",
      confirmPassword: "",
    };
    const existing = [
      { id: "u1", username: "ana" },
      { id: "u2", username: "luis" },
    ];

    expect(
      validateUserForm(
        { ...base, username: "ana" },
        USER_FORM_EDIT,
        existing,
        "u1"
      ).username
    ).toBeUndefined();

    expect(
      validateUserForm(
        { ...base, username: "nuevo" },
        USER_FORM_EDIT,
        existing,
        "u1"
      ).username
    ).toBeUndefined();

    expect(
      validateUserForm(
        { ...base, username: "luis" },
        USER_FORM_EDIT,
        existing,
        "u1"
      ).username
    ).toBe(USERNAME_TAKEN_MESSAGE);
  });
});

describe("useUserForm", () => {
  it("parte de los datos del usuario en modo edicion", () => {
    const { result } = renderHook(() =>
      useUserForm({
        mode: USER_FORM_EDIT,
        user: USERS_FIXTURE,
        onSubmit: vi.fn(),
      })
    );

    expect(result.current.isEdit).toBe(true);
    expect(result.current.values.name).toBe("Ana Torres");
    expect(result.current.values.username).toBe("ana");
    expect(result.current.values.email).toBe("ana@crokets.test");
    expect(result.current.values.role).toBe("admin");
    expect(result.current.values.password).toBe("");
  });

  it("expone feedback positivo de disponibilidad y confirmacion", () => {
    const { result } = renderHook(() =>
      useUserForm({
        mode: USER_FORM_CREATE,
        existingUsers: [{ username: "ana", email: "ana@crokets.test" }],
        onSubmit: vi.fn(),
      })
    );

    act(() => {
      result.current.handleChange("username", "nuevo");
      result.current.handleChange("email", "nuevo@crokets.test");
      result.current.handleChange("password", "secreto123");
      result.current.handleChange("confirmPassword", "secreto123");
    });

    expect(result.current.getFieldSuccess("username")).toBe(
      USERNAME_AVAILABLE_MESSAGE
    );
    expect(result.current.getFieldSuccess("email")).toBe(
      EMAIL_AVAILABLE_MESSAGE
    );
    expect(result.current.getFieldSuccess("confirmPassword")).toBe(
      PASSWORD_MATCH_MESSAGE
    );
    expect(result.current.getFieldError("username")).toBe("");
  });

  it("reporta usuario y correo no disponibles frente al catalogo", () => {
    const { result } = renderHook(() =>
      useUserForm({
        mode: USER_FORM_CREATE,
        existingUsers: [{ username: "ana", email: "ana@crokets.test" }],
        onSubmit: vi.fn(),
      })
    );

    act(() => {
      result.current.handleChange("username", "ana");
      result.current.handleChange("email", "ana@crokets.test");
      result.current.handleBlur("username");
      result.current.handleBlur("email");
    });

    expect(result.current.getFieldError("username")).toBe(
      USERNAME_TAKEN_MESSAGE
    );
    expect(result.current.getFieldError("email")).toBe(EMAIL_TAKEN_MESSAGE);
    expect(result.current.getFieldSuccess("username")).toBe("");
    expect(result.current.getFieldSuccess("email")).toBe("");
  });

  it("no muestra feedback de confirmacion cuando las contrasenas difieren", () => {
    const { result } = renderHook(() =>
      useUserForm({ mode: USER_FORM_CREATE, onSubmit: vi.fn() })
    );

    act(() => {
      result.current.handleChange("password", "secreto123");
      result.current.handleChange("confirmPassword", "otraClave1");
    });

    expect(result.current.getFieldSuccess("confirmPassword")).toBe("");
  });

  it("expone errores solo tras blur o intento de envio", () => {
    const { result } = renderHook(() =>
      useUserForm({ mode: USER_FORM_CREATE, onSubmit: vi.fn() })
    );

    expect(result.current.getFieldError("name")).toBe("");

    act(() => result.current.handleBlur("name"));

    expect(result.current.getFieldError("name")).toBeTruthy();
  });

  it("no envia el formulario si hay errores", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useUserForm({ mode: USER_FORM_CREATE, onSubmit })
    );

    act(() => result.current.handleSubmit({ preventDefault: vi.fn() }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("normaliza el nombre en mayusculas y el usuario y correo en minusculas", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useUserForm({
        mode: USER_FORM_EDIT,
        user: {
          ...USERS_FIXTURE,
          name: "  Ana Torres  ",
          username: "  ana  ",
          email: "  Ana@Crokets.test  ",
        },
        onSubmit,
      })
    );

    act(() => result.current.handleSubmit({ preventDefault: vi.fn() }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: "ANA TORRES",
      username: "ana",
      email: "ana@crokets.test",
    });
  });

  it("captura el username en minusculas aunque se escriba en mayusculas", () => {
    const { result } = renderHook(() =>
      useUserForm({ mode: USER_FORM_CREATE, onSubmit: vi.fn() })
    );

    act(() => result.current.handleChange("username", "CARLOS"));

    expect(result.current.values.username).toBe("carlos");
  });

  it("mantiene el nombre completo en mayusculas mientras se escribe", () => {
    const { result } = renderHook(() =>
      useUserForm({ mode: USER_FORM_CREATE, onSubmit: vi.fn() })
    );

    act(() => result.current.handleChange("name", "carlos perez"));

    expect(result.current.values.name).toBe("CARLOS PEREZ");
  });

  it("preserva las mayusculas y minusculas exactas de la contrasena", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useUserForm({ mode: USER_FORM_CREATE, onSubmit })
    );

    act(() => {
      result.current.handleChange("name", "Nuevo Cajero");
      result.current.handleChange("username", "ncajero");
      result.current.handleChange("email", "ncajero@crokets.test");
      result.current.handleChange("role", "cajero");
      result.current.handleChange("password", "MiClaveSecreta1");
      result.current.handleChange("confirmPassword", "MiClaveSecreta1");
    });

    act(() => result.current.handleSubmit({ preventDefault: vi.fn() }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].password).toBe("MiClaveSecreta1");
  });

  it("envia los valores cuando el formulario es valido en edicion", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useUserForm({ mode: USER_FORM_EDIT, user: USERS_FIXTURE, onSubmit })
    );

    act(() => result.current.handleSubmit({ preventDefault: vi.fn() }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].name).toBe("ANA TORRES");
  });

  it("permite cambiar el username a uno libre en edicion", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useUserForm({
        mode: USER_FORM_EDIT,
        user: USERS_FIXTURE,
        existingUsers: [
          { id: "u1", username: "ana" },
          { id: "u2", username: "luis" },
        ],
        onSubmit,
      })
    );

    expect(result.current.getFieldError("username")).toBe("");
    expect(result.current.getFieldSuccess("username")).toBe(
      USERNAME_AVAILABLE_MESSAGE
    );

    act(() => result.current.handleChange("username", "nuevo"));

    expect(result.current.getFieldError("username")).toBe("");
    expect(result.current.getFieldSuccess("username")).toBe(
      USERNAME_AVAILABLE_MESSAGE
    );

    act(() => result.current.handleSubmit({ preventDefault: vi.fn() }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].username).toBe("nuevo");
  });

  it("no marca error si en edicion se usa el username de otro usuario", () => {
    const { result } = renderHook(() =>
      useUserForm({
        mode: USER_FORM_EDIT,
        user: USERS_FIXTURE,
        existingUsers: [
          { id: "u1", username: "ana" },
          { id: "u2", username: "luis" },
        ],
        onSubmit: vi.fn(),
      })
    );

    act(() => result.current.handleChange("username", "luis"));

    expect(result.current.getFieldError("username")).toBe(
      USERNAME_TAKEN_MESSAGE
    );
    expect(result.current.getFieldSuccess("username")).toBe("");
  });
});
