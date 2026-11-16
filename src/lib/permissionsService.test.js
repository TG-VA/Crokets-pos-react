import { describe, it, expect, vi } from "vitest";

vi.mock("./supabaseClient", () => ({ supabase: { from: vi.fn() } }));

import {
  ADMIN_BRANCH_HOME_PATH,
  branchRequiresCashRegister,
  canBranchAccessPath,
} from "./permissionsService";

const adminBranch = { id: "adm", branch_type: "admin" };
const operationalBranch = { id: "b1", branch_type: "operational" };

describe("canBranchAccessPath", () => {
  it.each([
    "/dashboard",
    "/sales",
    "/cashcut",
    "/cashcut/historial",
    "/invoices",
    "/invoices/clientes",
  ])("bloquea %s en una terminal admin", (path) => {
    expect(canBranchAccessPath(adminBranch, path)).toBe(false);
  });

  it.each([
    "/reports",
    "/inventory/traspasos",
    "/products",
    "/settings",
    "/customers",
  ])("permite %s en una terminal admin", (path) => {
    expect(canBranchAccessPath(adminBranch, path)).toBe(true);
  });

  it("no confunde prefijos parecidos", () => {
    expect(canBranchAccessPath(adminBranch, "/invoicesx")).toBe(true);
  });

  it("permite todo en una terminal operativa o sin tipo", () => {
    expect(canBranchAccessPath(operationalBranch, "/dashboard")).toBe(true);
    expect(canBranchAccessPath({ id: "b1" }, "/cashcut")).toBe(true);
    expect(canBranchAccessPath(null, "/invoices")).toBe(true);
  });

  it("la pagina de inicio de la terminal admin es accesible", () => {
    expect(canBranchAccessPath(adminBranch, ADMIN_BRANCH_HOME_PATH)).toBe(true);
  });
});

describe("branchRequiresCashRegister", () => {
  it("solo la terminal admin no usa caja", () => {
    expect(branchRequiresCashRegister(adminBranch)).toBe(false);
    expect(branchRequiresCashRegister(operationalBranch)).toBe(true);
    expect(branchRequiresCashRegister({ id: "b1" })).toBe(true);
    expect(branchRequiresCashRegister(null)).toBe(true);
  });
});
