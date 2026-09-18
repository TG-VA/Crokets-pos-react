import { describe, it, expect } from "vitest";

import {
  DESCRIPTION_MAX_LENGTH,
  DISCOUNT_TYPES,
  EMPTY_REWARD_FORM,
  FIXED_DISCOUNT_MAX_VALUE,
  NAME_MAX_LENGTH,
  POINTS_MAX_VALUE,
  QUANTITY_MAX_VALUE,
  REWARD_TYPES,
  buildNormalizedRewardData,
  buildRewardFormValues,
  buildRewardPayload,
  buildRewardTypeChange,
  canSubmitReward,
  diffRewardProductIds,
  getFilteredRewardProducts,
  getRewardFieldState,
  getSelectedRewardProducts,
  normalizeDiscountValue,
  normalizePoints,
  normalizeQuantity,
  normalizeRewardFieldValue,
  normalizeRewardType,
  normalizeUpperText,
  toggleRewardProductId,
  validateRewardValues,
} from "./rewardModalCalculationService";

const validFreeProductForm = {
  name: "PREMIO BASE",
  description: "",
  points_required: "100",
  is_active: true,
  reward_type: "free_product",
  reward_quantity: "1",
  discount_type: "",
  discount_value: "",
};

describe("rewardModalCalculationService", () => {
  describe("constantes", () => {
    it("expone los limites y catalogos del modal", () => {
      expect(NAME_MAX_LENGTH).toBe(80);
      expect(DESCRIPTION_MAX_LENGTH).toBe(250);
      expect(POINTS_MAX_VALUE).toBe(999999);
      expect(QUANTITY_MAX_VALUE).toBe(999);
      expect(FIXED_DISCOUNT_MAX_VALUE).toBe(99999);
      expect(REWARD_TYPES).toEqual({
        free_product: "Producto gratis",
        product_discount: "Descuento en producto",
      });
      expect(DISCOUNT_TYPES).toEqual({
        percent: "Porcentaje",
        fixed: "Monto fijo",
      });
      expect(EMPTY_REWARD_FORM).toEqual({
        name: "",
        description: "",
        points_required: "",
        is_active: true,
        reward_type: "free_product",
        reward_quantity: "1",
        discount_type: "",
        discount_value: "",
      });
    });
  });

  describe("normalizeRewardType", () => {
    it("conserva product_discount y cae a free_product en cualquier otro valor", () => {
      expect(normalizeRewardType("product_discount")).toBe("product_discount");
      expect(normalizeRewardType("free_product")).toBe("free_product");
      expect(normalizeRewardType("")).toBe("free_product");
      expect(normalizeRewardType(null)).toBe("free_product");
    });
  });

  describe("normalizeUpperText", () => {
    it("colapsa espacios y convierte a mayusculas", () => {
      expect(normalizeUpperText("  promo   dos  ")).toBe(" PROMO DOS ");
    });

    it("recorta a maxLength", () => {
      expect(normalizeUpperText("abcdef", 3)).toBe("ABC");
    });

    it("trata valores nulos como cadena vacia", () => {
      expect(normalizeUpperText(null)).toBe("");
      expect(normalizeUpperText(undefined)).toBe("");
    });
  });

  describe("normalizePoints", () => {
    it("deja solo digitos y limita a 6", () => {
      expect(normalizePoints("12a3")).toBe("123");
      expect(normalizePoints("1234567890")).toBe("123456");
      expect(normalizePoints(null)).toBe("");
    });
  });

  describe("normalizeQuantity", () => {
    it("deja solo digitos y limita a 3", () => {
      expect(normalizeQuantity("1x2")).toBe("12");
      expect(normalizeQuantity("12345")).toBe("123");
    });
  });

  describe("normalizeDiscountValue", () => {
    it("limita a 2 decimales y elimina ceros iniciales", () => {
      expect(normalizeDiscountValue("0012.345")).toBe("12.34");
      expect(normalizeDiscountValue("10")).toBe("10");
      expect(normalizeDiscountValue("abc")).toBe("");
    });
  });

  describe("normalizeRewardFieldValue", () => {
    it("normaliza cada campo y deja pasar is_active", () => {
      expect(normalizeRewardFieldValue("name", "abc")).toBe("ABC");
      expect(normalizeRewardFieldValue("points_required", "1a2")).toBe("12");
      expect(normalizeRewardFieldValue("reward_quantity", "9b9")).toBe("99");
      expect(normalizeRewardFieldValue("discount_value", "1.239")).toBe("1.23");
      expect(normalizeRewardFieldValue("is_active", false)).toBe(false);
    });
  });

  describe("validateRewardValues", () => {
    it("no devuelve errores con un formulario valido", () => {
      expect(validateRewardValues(validFreeProductForm, ["p1"])).toEqual({});
    });

    it("valida el nombre", () => {
      expect(
        validateRewardValues({ ...validFreeProductForm, name: "" }, ["p1"]).name
      ).toBe("Ingresa el nombre de la recompensa.");
      expect(
        validateRewardValues({ ...validFreeProductForm, name: "ab" }, ["p1"])
          .name
      ).toBe("El nombre debe tener al menos 3 caracteres.");
      expect(
        validateRewardValues(
          { ...validFreeProductForm, name: "x".repeat(81) },
          ["p1"]
        ).name
      ).toBe(`El nombre no puede superar ${NAME_MAX_LENGTH} caracteres.`);
    });

    it("valida la descripcion", () => {
      const errors = validateRewardValues(
        { ...validFreeProductForm, description: "x".repeat(251) },
        ["p1"]
      );

      expect(errors.description).toBe(
        `La descripción no puede superar ${DESCRIPTION_MAX_LENGTH} caracteres.`
      );
    });

    it("valida los puntos requeridos", () => {
      expect(
        validateRewardValues({ ...validFreeProductForm, points_required: "" }, [
          "p1",
        ]).points_required
      ).toBe("Ingresa los puntos requeridos.");
      expect(
        validateRewardValues(
          { ...validFreeProductForm, points_required: "0" },
          ["p1"]
        ).points_required
      ).toBe("Los puntos deben ser mayores a 0.");
      expect(
        validateRewardValues(
          { ...validFreeProductForm, points_required: "1000000" },
          ["p1"]
        ).points_required
      ).toBe(`Los puntos no pueden superar ${POINTS_MAX_VALUE}.`);
    });

    it("valida la cantidad", () => {
      expect(
        validateRewardValues({ ...validFreeProductForm, reward_quantity: "" }, [
          "p1",
        ]).reward_quantity
      ).toBe("Ingresa la cantidad permitida.");
      expect(
        validateRewardValues(
          { ...validFreeProductForm, reward_quantity: "0" },
          ["p1"]
        ).reward_quantity
      ).toBe("La cantidad debe ser mayor a 0.");
      expect(
        validateRewardValues(
          { ...validFreeProductForm, reward_quantity: "1000" },
          ["p1"]
        ).reward_quantity
      ).toBe(`La cantidad no puede superar ${QUANTITY_MAX_VALUE}.`);
    });

    it("exige al menos un producto para free_product", () => {
      const errors = validateRewardValues(validFreeProductForm, []);

      expect(errors.products).toBe(
        "Selecciona al menos un producto aplicable."
      );
    });

    it("valida el tipo de recompensa", () => {
      const errors = validateRewardValues(
        { ...validFreeProductForm, reward_type: "otro" },
        ["p1"]
      );

      expect(errors.reward_type).toBe(
        "Selecciona un tipo de recompensa válido."
      );
    });

    it("valida el descuento de product_discount", () => {
      const base = {
        ...validFreeProductForm,
        reward_type: "product_discount",
        discount_type: "",
        discount_value: "",
      };

      expect(validateRewardValues(base, []).discount_type).toBe(
        "Selecciona el tipo de descuento."
      );
      expect(validateRewardValues(base, []).discount_value).toBe(
        "Ingresa el valor del descuento."
      );

      expect(
        validateRewardValues(
          { ...base, discount_type: "percent", discount_value: "0" },
          []
        ).discount_value
      ).toBe("El descuento debe ser mayor a 0.");

      expect(
        validateRewardValues(
          { ...base, discount_type: "percent", discount_value: "150" },
          []
        ).discount_value
      ).toBe("El porcentaje debe estar entre 1 y 100.");

      expect(
        validateRewardValues(
          { ...base, discount_type: "fixed", discount_value: "100000" },
          []
        ).discount_value
      ).toBe(
        `El descuento fijo no puede superar $${FIXED_DISCOUNT_MAX_VALUE}.`
      );

      expect(
        validateRewardValues(
          { ...base, discount_type: "fixed", discount_value: "250" },
          []
        )
      ).toEqual({});
    });
  });

  describe("buildRewardFormValues", () => {
    it("devuelve una copia del formulario vacio sin recompensa", () => {
      const form = buildRewardFormValues(null);

      expect(form).toEqual(EMPTY_REWARD_FORM);
      expect(form).not.toBe(EMPTY_REWARD_FORM);
    });

    it("mapea una recompensa free_product", () => {
      const form = buildRewardFormValues({
        id: "r1",
        name: "PREMIO",
        description: "DESC",
        points_required: 50,
        is_active: false,
        reward_type: "free_product",
        reward_quantity: 2,
        discount_type: "fixed",
        discount_value: 30,
      });

      expect(form).toEqual({
        name: "PREMIO",
        description: "DESC",
        points_required: "50",
        is_active: false,
        reward_type: "free_product",
        reward_quantity: "2",
        discount_type: "",
        discount_value: "",
      });
    });

    it("mapea una recompensa product_discount con defaults", () => {
      const form = buildRewardFormValues({
        id: "r1",
        name: "DESC",
        reward_type: "product_discount",
        discount_type: null,
        discount_value: null,
      });

      expect(form.discount_type).toBe("percent");
      expect(form.discount_value).toBe("");

      const withValue = buildRewardFormValues({
        id: "r2",
        reward_type: "product_discount",
        discount_type: "fixed",
        discount_value: 25,
      });

      expect(withValue.discount_value).toBe("25");
      expect(withValue.is_active).toBe(true);
      expect(withValue.reward_quantity).toBe("1");
    });
  });

  describe("buildRewardTypeChange", () => {
    it("al pasar a product_discount define percent y conserva cantidad", () => {
      const { needsProducts, values } = buildRewardTypeChange(
        { ...validFreeProductForm, reward_quantity: "" },
        "product_discount"
      );

      expect(needsProducts).toBe(false);
      expect(values.reward_type).toBe("product_discount");
      expect(values.discount_type).toBe("percent");
      expect(values.reward_quantity).toBe("1");
    });

    it("al volver a free_product limpia el descuento y pide productos", () => {
      const { needsProducts, values } = buildRewardTypeChange(
        {
          ...validFreeProductForm,
          reward_type: "product_discount",
          discount_type: "fixed",
          discount_value: "30",
        },
        "free_product"
      );

      expect(needsProducts).toBe(true);
      expect(values.reward_type).toBe("free_product");
      expect(values.discount_type).toBe("");
      expect(values.discount_value).toBe("");
    });
  });

  describe("canSubmitReward", () => {
    it("requiere nombre valido, puntos y sin errores", () => {
      expect(
        canSubmitReward({
          formData: validFreeProductForm,
          errors: {},
          saving: false,
        })
      ).toBe(true);
      expect(
        canSubmitReward({
          formData: { ...validFreeProductForm, name: "ab" },
          errors: {},
          saving: false,
        })
      ).toBe(false);
      expect(
        canSubmitReward({
          formData: validFreeProductForm,
          errors: {},
          saving: true,
        })
      ).toBe(false);
      expect(
        canSubmitReward({
          formData: validFreeProductForm,
          errors: { products: "x" },
          saving: false,
        })
      ).toBe(false);
    });
  });

  describe("buildNormalizedRewardData", () => {
    it("normaliza nombre/descripcion y convierte numericos", () => {
      const data = buildNormalizedRewardData(
        {
          ...validFreeProductForm,
          name: " premio  x ",
          description: " desc ",
          points_required: "150",
          reward_quantity: "2",
          discount_type: "fixed",
          discount_value: "30",
        },
        false
      );

      expect(data.name).toBe("PREMIO X");
      expect(data.description).toBe("DESC");
      expect(data.points_required).toBe(150);
      expect(data.reward_quantity).toBe(2);
      expect(data.discount_type).toBeNull();
      expect(data.discount_value).toBeNull();
    });

    it("conserva el descuento cuando es requerido", () => {
      const data = buildNormalizedRewardData(
        {
          ...validFreeProductForm,
          reward_type: "product_discount",
          discount_type: "percent",
          discount_value: "15",
        },
        true
      );

      expect(data.reward_type).toBe("product_discount");
      expect(data.discount_type).toBe("percent");
      expect(data.discount_value).toBe(15);
    });
  });

  describe("buildRewardPayload", () => {
    it("arma el payload con updated_at y descripcion nula", () => {
      const normalized = buildNormalizedRewardData(
        { ...validFreeProductForm, description: "" },
        false
      );

      const payload = buildRewardPayload(
        normalized,
        "2026-09-17T00:00:00.000Z"
      );

      expect(payload).toEqual({
        name: "PREMIO BASE",
        description: null,
        points_required: 100,
        is_active: true,
        reward_type: "free_product",
        reward_quantity: 1,
        discount_type: null,
        discount_value: null,
        updated_at: "2026-09-17T00:00:00.000Z",
      });
    });
  });

  describe("diffRewardProductIds", () => {
    it("calcula altas y bajas", () => {
      expect(diffRewardProductIds(["a", "b"], ["b", "c"])).toEqual({
        productIdsToInsert: ["c"],
        productIdsToDelete: ["a"],
      });
    });
  });

  describe("toggleRewardProductId", () => {
    it("agrega y quita el producto", () => {
      expect(toggleRewardProductId(["a"], "b")).toEqual(["a", "b"]);
      expect(toggleRewardProductId(["a", "b"], "a")).toEqual(["b"]);
    });
  });

  describe("getSelectedRewardProducts", () => {
    it("respeta el orden del catalogo", () => {
      const products = [{ id: "a" }, { id: "b" }, { id: "c" }];

      expect(getSelectedRewardProducts(products, ["c", "a"])).toEqual([
        { id: "a" },
        { id: "c" },
      ]);
    });
  });

  describe("getFilteredRewardProducts", () => {
    const products = [
      { id: "a", name: "Croquetas", barcode: "111", sale_price: 100 },
      { id: "b", name: "Juguete", barcode: "222", sale_price: 50 },
    ];

    it("devuelve [] con menos de 2 caracteres", () => {
      expect(
        getFilteredRewardProducts({
          products,
          searchTerm: "c",
          selectedProductIds: [],
        })
      ).toEqual([]);
    });

    it("busca por nombre, barcode o precio y excluye seleccionados", () => {
      expect(
        getFilteredRewardProducts({
          products,
          searchTerm: "cro",
          selectedProductIds: [],
        }).map((p) => p.id)
      ).toEqual(["a"]);

      expect(
        getFilteredRewardProducts({
          products,
          searchTerm: "222",
          selectedProductIds: [],
        }).map((p) => p.id)
      ).toEqual(["b"]);

      expect(
        getFilteredRewardProducts({
          products,
          searchTerm: "50",
          selectedProductIds: ["b"],
        })
      ).toEqual([]);
    });
  });

  describe("getRewardFieldState", () => {
    it("no marca nada si el campo no fue tocado", () => {
      expect(
        getRewardFieldState({
          field: "name",
          touchedFields: {},
          fieldErrors: {},
          formData: validFreeProductForm,
        })
      ).toBe("");
    });

    it("marca invalido con error y valido con valor", () => {
      expect(
        getRewardFieldState({
          field: "name",
          touchedFields: { name: true },
          fieldErrors: { name: "x" },
          formData: validFreeProductForm,
        })
      ).toBe("invalid");

      expect(
        getRewardFieldState({
          field: "name",
          touchedFields: { name: true },
          fieldErrors: {},
          formData: validFreeProductForm,
        })
      ).toBe("valid");
    });
  });
});
