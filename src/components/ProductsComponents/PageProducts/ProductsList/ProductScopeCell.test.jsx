import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ProductScopeCell from "./ProductScopeCell";

describe("ProductScopeCell", () => {
  it("muestra Global sin sucursales", () => {
    render(<ProductScopeCell isGlobal branchNames={["Coba"]} />);
    expect(screen.getByText("Global")).toBeTruthy();
    expect(screen.queryByText("Coba")).toBeNull();
  });

  it("muestra Local con una pastilla por sucursal", () => {
    render(
      <ProductScopeCell isGlobal={false} branchNames={["Coba", "Torres"]} />
    );
    expect(screen.getByText("Local")).toBeTruthy();
    expect(screen.getByText("Coba")).toBeTruthy();
    expect(screen.getByText("Torres")).toBeTruthy();
  });

  it("muestra Local sin pastillas si branchNames no es un arreglo", () => {
    render(<ProductScopeCell isGlobal={false} branchNames={undefined} />);
    expect(screen.getByText("Local")).toBeTruthy();
  });

  it("no afirma alcance cuando is_global no esta disponible", () => {
    render(<ProductScopeCell isGlobal={null} branchNames={[]} />);
    expect(screen.queryByText("Local")).toBeNull();
    expect(screen.queryByText("Global")).toBeNull();
  });
});
