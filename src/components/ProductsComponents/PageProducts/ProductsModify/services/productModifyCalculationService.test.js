import { describe, it, expect } from "vitest";

import {
  buildDiscountPayload,
  buildProductPayload,
  calculateGanancia,
  getDiscountPercentFromPrice,
  getDiscountPriceFromPercent,
  roundMoney,
  roundPercent,
  validateProductModifyForm,
} from "./productModifyCalculationService";

const buildValidForm = () => ({
  codigo: "7501001234567",
  descripcion: "CROQUETAS PREMIUM",
  costo: "80",
  precio: "100",
  departamento: "ALIMENTO",
  minimo: 5,
  maximo: 20,
  use_inventory: true,
  sale_type: "unidad",
  unit: "pieza",
  tax: 16,
  cfdi: "G03",
  status: "activo",
  isGlobal: false,
  commission_enabled: true,
  commission_type: "percent",
  commission_value: "10",
  discount_enable: false,
  discount_percent: 0,
  discount_price: "",
  discount_concept: "",
});

const noDuplicate = () => null;

describe("productModifyCalculationService", () => {
  describe("calculateGanancia", () => {
    it("calcula el margen porcentual estandar", () => {
      expect(calculateGanancia("80", "100")).toBe(25);
    });

    it("devuelve 100 (margen completo) con costo cero y precio positivo", () => {
      expect(calculateGanancia("0", "100")).toBe(100);
    });

    it("devuelve 0 cuando ambos valores son cero", () => {
      expect(calculateGanancia("0", "0")).toBe(0);
    });

    it("devuelve 0 con valores negativos", () => {
      expect(calculateGanancia("-10", "100")).toBe(0);
    });

    it("devuelve 0 con valores no numericos", () => {
      expect(calculateGanancia("abc", "100")).toBe(0);
      expect(calculateGanancia(undefined, undefined)).toBe(0);
    });

    it("devuelve margen negativo cuando el precio es menor al costo", () => {
      expect(calculateGanancia("120", "100")).toBeCloseTo(-16.666666, 5);
    });
  });

  describe("roundMoney", () => {
    it("redondea a 2 decimales con formato fijo", () => {
      expect(roundMoney(10.005)).toBe("10.01");
      expect(roundMoney("1.239")).toBe("1.24");
      expect(roundMoney(0)).toBe("0.00");
    });

    it("devuelve cadena vacia con valores no finitos", () => {
      expect(roundMoney("abc")).toBe("");
      expect(roundMoney(undefined)).toBe("");
      expect(roundMoney(Infinity)).toBe("");
    });
  });

  describe("roundPercent", () => {
    it("redondea a 2 decimales sin relleno", () => {
      expect(roundPercent(12.345)).toBe("12.35");
      expect(roundPercent(12)).toBe("12");
      expect(roundPercent(0)).toBe("0");
    });

    it("devuelve cadena vacia con valores no finitos", () => {
      expect(roundPercent("abc")).toBe("");
      expect(roundPercent(undefined)).toBe("");
    });
  });

  describe("getDiscountPriceFromPercent", () => {
    it("calcula el precio con descuento", () => {
      expect(getDiscountPriceFromPercent(100, 15)).toBe("85.00");
      expect(getDiscountPriceFromPercent("200", "10")).toBe("180.00");
    });

    it("devuelve cadena vacia con precio o porcentaje invalidos", () => {
      expect(getDiscountPriceFromPercent(0, 15)).toBe("");
      expect(getDiscountPriceFromPercent(-5, 15)).toBe("");
      expect(getDiscountPriceFromPercent("abc", 15)).toBe("");
      expect(getDiscountPriceFromPercent(100, 0)).toBe("");
      expect(getDiscountPriceFromPercent(100, -5)).toBe("");
      expect(getDiscountPriceFromPercent(100, "xyz")).toBe("");
    });
  });

  describe("getDiscountPercentFromPrice", () => {
    it("calcula el porcentaje a partir del precio rebajado", () => {
      expect(getDiscountPercentFromPrice(100, 85)).toBe("15");
      expect(getDiscountPercentFromPrice("100", "80")).toBe("20");
    });

    it("devuelve cadena vacia con valores invalidos", () => {
      expect(getDiscountPercentFromPrice(0, 85)).toBe("");
      expect(getDiscountPercentFromPrice(-5, 85)).toBe("");
      expect(getDiscountPercentFromPrice("abc", 85)).toBe("");
      expect(getDiscountPercentFromPrice(100, -1)).toBe("");
      expect(getDiscountPercentFromPrice(100, "xyz")).toBe("");
    });
  });

  describe("validateProductModifyForm", () => {
    it("no devuelve errores con un formulario valido y producto seleccionado", () => {
      const result = validateProductModifyForm({
        form: buildValidForm(),
        usesInventory: true,
        getProductByCodigo: noDuplicate,
        selectedProductId: "p1",
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("marca el formulario invalido sin producto seleccionado", () => {
      const result = validateProductModifyForm({
        form: buildValidForm(),
        usesInventory: true,
        getProductByCodigo: noDuplicate,
        selectedProductId: null,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual({});
    });

    it("valida codigo obligatorio", () => {
      const { errors } = validateProductModifyForm({
        form: { ...buildValidForm(), codigo: "  " },
        usesInventory: true,
        getProductByCodigo: noDuplicate,
        selectedProductId: "p1",
      });

      expect(errors.codigo).toBe("El código de barras es obligatorio.");
    });

    it("detecta codigo duplicado de otro producto", () => {
      const { errors } = validateProductModifyForm({
        form: buildValidForm(),
        usesInventory: true,
        getProductByCodigo: () => ({ id: "p2" }),
        selectedProductId: "p1",
      });

      expect(errors.codigo).toBe("Ya existe otro producto con ese código.");
    });

    it("no marca duplicado cuando el codigo pertenece al producto editado", () => {
      const { errors } = validateProductModifyForm({
        form: buildValidForm(),
        usesInventory: true,
        getProductByCodigo: () => ({ id: "p1" }),
        selectedProductId: "p1",
      });

      expect(errors.codigo).toBeUndefined();
    });

    it("valida descripcion obligatoria", () => {
      const { errors } = validateProductModifyForm({
        form: { ...buildValidForm(), descripcion: "" },
        usesInventory: true,
        getProductByCodigo: noDuplicate,
        selectedProductId: "p1",
      });

      expect(errors.descripcion).toBe("La descripción es obligatoria.");
    });

    it("valida costo no numerico y negativo", () => {
      const emptyCost = validateProductModifyForm({
        form: { ...buildValidForm(), costo: "" },
        usesInventory: true,
        getProductByCodigo: noDuplicate,
        selectedProductId: "p1",
      });
      expect(emptyCost.errors.costo).toBe(
        "Debes capturar el precio costo global."
      );

      const negativeCost = validateProductModifyForm({
        form: { ...buildValidForm(), costo: "-1" },
        usesInventory: true,
        getProductByCodigo: noDuplicate,
        selectedProductId: "p1",
      });
      expect(negativeCost.errors.costo).toBe(
        "El precio costo global no puede ser menor a 0."
      );
    });

    it("valida precio no numerico, menor o igual a cero y menor al costo", () => {
      const emptyPrice = validateProductModifyForm({
        form: { ...buildValidForm(), precio: "" },
        usesInventory: true,
        getProductByCodigo: noDuplicate,
        selectedProductId: "p1",
      });
      expect(emptyPrice.errors.precio).toBe(
        "Debes capturar el precio venta global."
      );

      const zeroPrice = validateProductModifyForm({
        form: { ...buildValidForm(), precio: "0" },
        usesInventory: true,
        getProductByCodigo: noDuplicate,
        selectedProductId: "p1",
      });
      expect(zeroPrice.errors.precio).toBe(
        "El precio venta global debe ser mayor a 0."
      );

      const resultBelowCost = validateProductModifyForm({
        form: { ...buildValidForm(), precio: "70" },
        usesInventory: true,
        getProductByCodigo: noDuplicate,
        selectedProductId: "p1",
      });
      expect(resultBelowCost.errors.precio).toBe(
        "El precio venta global no puede ser menor al precio costo global."
      );
    });

    it("valida IVA negativo", () => {
      const { errors } = validateProductModifyForm({
        form: { ...buildValidForm(), tax: "-1" },
        usesInventory: true,
        getProductByCodigo: noDuplicate,
        selectedProductId: "p1",
      });

      expect(errors.tax).toBe("El IVA no puede ser negativo.");
    });

    describe("con inventario activo", () => {
      it("valida stock minimo y maximo", () => {
        const { errors } = validateProductModifyForm({
          form: { ...buildValidForm(), minimo: "" },
          usesInventory: true,
          getProductByCodigo: noDuplicate,
          selectedProductId: "p1",
        });
        expect(errors.minimo).toBe("Debes capturar el stock mínimo.");
      });

      it("valida negativos", () => {
        const { errors } = validateProductModifyForm({
          form: { ...buildValidForm(), minimo: "-1", maximo: "-1" },
          usesInventory: true,
          getProductByCodigo: noDuplicate,
          selectedProductId: "p1",
        });
        expect(errors.minimo).toBe("El stock mínimo no puede ser negativo.");
        expect(errors.maximo).toBe("El stock máximo no puede ser negativo.");
      });

      it("valida que el maximo no sea menor al minimo", () => {
        const { errors } = validateProductModifyForm({
          form: { ...buildValidForm(), minimo: 10, maximo: 5 },
          usesInventory: true,
          getProductByCodigo: noDuplicate,
          selectedProductId: "p1",
        });
        expect(errors.maximo).toBe(
          "El stock máximo no puede ser menor que el stock mínimo."
        );
      });
    });

    it("no valida stock cuando el inventario esta desactivado", () => {
      const { errors } = validateProductModifyForm({
        form: { ...buildValidForm(), minimo: "", maximo: "" },
        usesInventory: false,
        getProductByCodigo: noDuplicate,
        selectedProductId: "p1",
      });

      expect(errors.minimo).toBeUndefined();
      expect(errors.maximo).toBeUndefined();
    });

    it("valida la comision cuando esta habilitada", () => {
      const emptyValue = validateProductModifyForm({
        form: { ...buildValidForm(), commission_value: "" },
        usesInventory: true,
        getProductByCodigo: noDuplicate,
        selectedProductId: "p1",
      });
      expect(emptyValue.errors.commission_value).toBe(
        "Debes capturar el valor de la comisión."
      );

      const negativeValue = validateProductModifyForm({
        form: { ...buildValidForm(), commission_value: "-5" },
        usesInventory: true,
        getProductByCodigo: noDuplicate,
        selectedProductId: "p1",
      });
      expect(negativeValue.errors.commission_value).toBe(
        "La comisión no puede ser negativa."
      );
    });

    it("no valida la comision cuando esta deshabilitada", () => {
      const { errors } = validateProductModifyForm({
        form: {
          ...buildValidForm(),
          commission_enabled: false,
          commission_value: "",
        },
        usesInventory: true,
        getProductByCodigo: noDuplicate,
        selectedProductId: "p1",
      });

      expect(errors.commission_value).toBeUndefined();
    });

    describe("con descuento activo", () => {
      const discountForm = () => ({
        ...buildValidForm(),
        discount_enable: true,
        discount_percent: 10,
        discount_price: "90",
        discount_concept: "PROMO",
      });

      it("no devuelve errores con un descuento valido", () => {
        const { errors } = validateProductModifyForm({
          form: discountForm(),
          usesInventory: true,
          getProductByCodigo: noDuplicate,
          selectedProductId: "p1",
        });

        expect(errors).toEqual({});
      });

      it("valida porcentaje de descuento", () => {
        const emptyPercent = validateProductModifyForm({
          form: { ...discountForm(), discount_percent: "" },
          usesInventory: true,
          getProductByCodigo: noDuplicate,
          selectedProductId: "p1",
        });
        expect(emptyPercent.errors.discount_percent).toBe(
          "Debes capturar el porcentaje de descuento."
        );

        const zeroPercent = validateProductModifyForm({
          form: { ...discountForm(), discount_percent: 0 },
          usesInventory: true,
          getProductByCodigo: noDuplicate,
          selectedProductId: "p1",
        });
        expect(zeroPercent.errors.discount_percent).toBe(
          "El descuento debe ser mayor a 0 cuando está activo."
        );

        const fullPercent = validateProductModifyForm({
          form: { ...discountForm(), discount_percent: 100 },
          usesInventory: true,
          getProductByCodigo: noDuplicate,
          selectedProductId: "p1",
        });
        expect(fullPercent.errors.discount_percent).toBe(
          "El descuento debe ser menor a 100%."
        );
      });

      it("valida el precio con descuento", () => {
        const emptyPrice = validateProductModifyForm({
          form: { ...discountForm(), discount_price: "" },
          usesInventory: true,
          getProductByCodigo: noDuplicate,
          selectedProductId: "p1",
        });
        expect(emptyPrice.errors.discount_price).toBe(
          "Debes capturar el precio con descuento."
        );

        const zeroPrice = validateProductModifyForm({
          form: { ...discountForm(), discount_price: "0" },
          usesInventory: true,
          getProductByCodigo: noDuplicate,
          selectedProductId: "p1",
        });
        expect(zeroPrice.errors.discount_price).toBe(
          "El precio con descuento debe ser mayor a 0."
        );

        const aboveSalePrice = validateProductModifyForm({
          form: { ...discountForm(), discount_price: "101" },
          usesInventory: true,
          getProductByCodigo: noDuplicate,
          selectedProductId: "p1",
        });
        expect(aboveSalePrice.errors.discount_price).toBe(
          "El precio con descuento debe ser menor al precio venta global."
        );
      });

      it("valida el concepto del descuento", () => {
        const { errors } = validateProductModifyForm({
          form: { ...discountForm(), discount_concept: "  " },
          usesInventory: true,
          getProductByCodigo: noDuplicate,
          selectedProductId: "p1",
        });

        expect(errors.discount_concept).toBe(
          "Debes capturar el concepto del descuento."
        );
      });
    });
  });

  describe("buildProductPayload", () => {
    it("construye el payload con comision porcentual", () => {
      const payload = buildProductPayload(buildValidForm(), 25, true);

      expect(payload.codigo).toBe("7501001234567");
      expect(payload.descripcion).toBe("CROQUETAS PREMIUM");
      expect(payload.costo).toBe(80);
      expect(payload.precio).toBe(100);
      expect(payload.ganancia).toBe(25);
      expect(payload.minimo).toBe(5);
      expect(payload.maximo).toBe(20);
      expect(payload.use_inventory).toBe(true);
      expect(payload.commission_type).toBe("percent");
      expect(payload.commission_value).toBe(10);
      expect(payload.commission_percent).toBe(10);
    });

    it("pone stock en 0 cuando no se usa inventario", () => {
      const payload = buildProductPayload(buildValidForm(), 25, false);

      expect(payload.minimo).toBe(0);
      expect(payload.maximo).toBe(0);
      expect(payload.use_inventory).toBe(false);
    });

    it("deja commission_percent en 0 para comision fija", () => {
      const payload = buildProductPayload(
        {
          ...buildValidForm(),
          commission_type: "flat",
          commission_value: "50",
        },
        0,
        true
      );

      expect(payload.commission_type).toBe("flat");
      expect(payload.commission_value).toBe(50);
      expect(payload.commission_percent).toBe(0);
    });

    it("aplica defaults y coercion de numeros invalidos", () => {
      const payload = buildProductPayload(
        {
          ...buildValidForm(),
          costo: "",
          precio: "",
          departamento: "  ",
          cfdi: "",
          sale_type: "",
          unit: "",
          tax: "",
          commission_value: "",
          status: "activo",
          isGlobal: false,
        },
        0,
        true
      );

      expect(payload.costo).toBe(0);
      expect(payload.precio).toBe(0);
      expect(payload.departamento).toBe("");
      expect(payload.cfdi).toBe("");
      expect(payload.sale_type).toBe("unidad");
      expect(payload.unit).toBe("pieza");
      expect(payload.tax).toBe(0);
      expect(payload.commission_value).toBe(0);
      expect(payload.isGlobal).toBe(false);
    });
  });

  describe("buildDiscountPayload", () => {
    it("construye el payload con descuento habilitado", () => {
      const payload = buildDiscountPayload({
        discount_enable: true,
        discount_percent: "15",
        discount_concept: "  PROMO VERANO  ",
      });

      expect(payload.enabled).toBe(true);
      expect(payload.discount_percent).toBe(15);
      expect(payload.discount_concept).toBe("PROMO VERANO");
    });

    it("construye el payload con descuento deshabilitado", () => {
      const payload = buildDiscountPayload({
        discount_enable: false,
        discount_percent: "15",
        discount_concept: "",
      });

      expect(payload.enabled).toBe(false);
      expect(payload.discount_percent).toBe(15);
      expect(payload.discount_concept).toBe("");
    });
  });
});
