import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, isBcryptHash } from "./password";

describe("password helpers", () => {
  it("genera un hash bcrypt verificable", () => {
    const hash = hashPassword("1234");

    expect(isBcryptHash(hash)).toBe(true);
    expect(hash).not.toBe("1234");
    expect(verifyPassword("1234", hash)).toEqual({ valid: true, needsUpgrade: false });
    expect(verifyPassword("otra", hash)).toEqual({ valid: false, needsUpgrade: false });
  });

  it("marca para upgrade una contraseña legacy en texto plano que coincide", () => {
    expect(verifyPassword("1234", "1234")).toEqual({ valid: true, needsUpgrade: true });
  });

  it("rechaza una contraseña legacy que no coincide sin pedir upgrade", () => {
    expect(verifyPassword("9999", "1234")).toEqual({ valid: false, needsUpgrade: false });
  });

  it("rechaza entradas no string", () => {
    expect(verifyPassword(null, "1234")).toEqual({ valid: false, needsUpgrade: false });
    expect(verifyPassword("1234", null)).toEqual({ valid: false, needsUpgrade: false });
  });

  it("no reconoce como hash valores en texto plano", () => {
    expect(isBcryptHash("1234")).toBe(false);
    expect(isBcryptHash("")).toBe(false);
    expect(isBcryptHash(null)).toBe(false);
  });

  it("no reconoce como hash un valor que solo copia el prefijo bcrypt", () => {
    expect(isBcryptHash("$2a$10$invalido")).toBe(false);
    expect(verifyPassword("1234", "$2a$10$invalido")).toEqual({
      valid: false,
      needsUpgrade: false,
    });
  });

  it("lanza error al hashear una contraseña vacía", () => {
    expect(() => hashPassword("")).toThrow("La contraseña no puede estar vacía");
  });
});
