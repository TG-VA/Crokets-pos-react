import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ImportInstructions from "./ImportInstructions";
import {
  REQUIRED_COLUMNS,
  OPTIONAL_COLUMNS,
  DEPARTMENT_RULES,
  ALLOWED_VALUES,
  MAX_FILE_NOTE,
} from "../../utils/importInstructionsConfig";

const renderWithRealDescriptors = () =>
  render(
    <ImportInstructions
      requiredColumns={REQUIRED_COLUMNS}
      optionalColumns={OPTIONAL_COLUMNS}
      departmentRules={DEPARTMENT_RULES}
      allowedValues={ALLOWED_VALUES}
      footNote={MAX_FILE_NOTE}
    />
  );

const chipsOf = (label) =>
  screen.getByText(label).parentElement.querySelectorAll("li");

describe("ImportInstructions", () => {
  it("muestra las columnas obligatorias y opcionales como chips", () => {
    renderWithRealDescriptors();

    expect(chipsOf("Obligatorias")).toHaveLength(9);
    expect(chipsOf("Opcionales")).toHaveLength(5);
    expect([...chipsOf("Obligatorias")].map((li) => li.textContent)).toEqual(
      REQUIRED_COLUMNS
    );
    expect([...chipsOf("Opcionales")].map((li) => li.textContent)).toEqual(
      OPTIONAL_COLUMNS
    );
  });

  it("muestra las reglas de Departamento, los valores permitidos y la nota", () => {
    const { container } = renderWithRealDescriptors();

    DEPARTMENT_RULES.forEach((rule) => {
      expect(screen.getByText(rule)).toBeTruthy();
    });
    expect(DEPARTMENT_RULES).toHaveLength(2);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(screen.getByText(MAX_FILE_NOTE)).toBeTruthy();
  });
});
