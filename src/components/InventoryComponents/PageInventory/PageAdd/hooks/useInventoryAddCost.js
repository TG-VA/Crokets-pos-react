import { useCallback, useMemo, useState } from "react";

import {
  ENTRY_MODE,
  getCurrentUnitCost,
  projectIncomingCost,
  suggestIncomingCostInput,
} from "../services/inventoryAddProjectionService";

const COST_INPUT_PATTERN = /^\d*\.?\d{0,2}$/;

/**
 * Sanea el texto capturado en el campo de costo de compra.
 *
 * Solo admite digitos con hasta dos decimales: el costo de adquisicion se
 * redondea a 2 decimales antes de entrar al CPP, asi que permitir mas digitos
 * invitaria a capturar una precision que el sistema va a descartar. El signo se
 * rechaza en captura (no al enviar) para que el mensaje de error pueda explicar
 * la regla en lugar de dejar el campo vacio sin motivo.
 *
 * @param {string} rawValue
 * @returns {string}
 */
const sanitizeCostInput = (rawValue) => {
  const clean = String(rawValue ?? "")
    .replace(",", ".")
    .trim();

  if (!clean) return "";

  return COST_INPUT_PATTERN.test(clean) ? clean : null;
};

/**
 * Identidad del producto cuya captura de costo esta vigente.
 *
 * Se usa como clave de reseteo del borrador, no como trigger de un efecto.
 * @param {object|null} product
 * @returns {string|null}
 */
const getProductCostKey = (product) => {
  if (!product) return null;

  return String(
    product.product_id ?? product.id ?? product.codigo ?? "sin-identificador"
  );
};

/**
 * useInventoryAddCost
 * Estado y ciclo de vida de la captura de costo de la entrada de inventario.
 *
 * Vive separado de `useInventoryAdd` porque es un subdominio con reglas propias:
 * el modo de la entrada, la validacion del costo de compra y la proyeccion del
 * CPP resultante. El flujo de la pagina no necesita saber como se sanitizea un
 * importe, solo recibir el `incomingCostPrice` ya resuelto.
 *
 * @param {object} params
 * @param {object} params.selectedProduct Producto seleccionado, o null.
 * @param {unknown} params.quantity Cantidad capturada en el formulario.
 * @returns {object} Estado de la entrada de costo y sus callbacks.
 */
const useInventoryAddCost = ({ selectedProduct, quantity } = {}) => {
  const [entryMode, setEntryMode] = useState(ENTRY_MODE.PURCHASE);

  // El borrador del campo de costo viaja junto con la clave del producto al que
  // pertenece. Al cambiar de producto se descarta el texto anterior y se
  // precarga el costo vigente del nuevo.
  const [costDraft, setCostDraft] = useState({ productKey: null, value: "" });

  const currentCost = useMemo(() => {
    return getCurrentUnitCost(selectedProduct);
  }, [selectedProduct]);

  const productCostKey = getProductCostKey(selectedProduct);

  // Ajuste de estado durante el render (patron recomendado por React para
  // reiniciar estado cuando cambia una prop). Se evita un `useEffect` a proposito:
  // un efecto que hace `setState` sincrono provoke un segundo render en cascada,
  // y depender del objeto `selectedProduct` en su lista de dependencias borraria
  // lo que el usuario esta escribiendo, porque `refreshProducts()` reconstruye el
  // catalogo y cambia la identidad de los objetos sin cambiar sus valores.
  if (costDraft.productKey !== productCostKey) {
    setCostDraft({
      productKey: productCostKey,
      value:
        productCostKey === null ? "" : suggestIncomingCostInput(currentCost),
    });
  }

  const incomingCostInput = costDraft.value;

  const isPurchase = entryMode === ENTRY_MODE.PURCHASE;

  // El guard de texto vacio va antes de la coercion: `Number("")` es `0`, y sin
  // el guard un campo en blanco se anunciaria como una compra a costo cero que
  // derrumba el CPP proyectado. Un campo vacio no es un cero capturado, es una
  // captura ausente, y se traduce a `null` para que `resolveIncomingCostPrice`
  // valorice la mercancia al costo vigente y deje el CPP intacto. El submit ya
  // esta bloqueado por `costError` en ese escenario.
  const parsedIncomingCost = useMemo(() => {
    if (!incomingCostInput?.trim()) return null;

    const parsed = Number(incomingCostInput);

    return Number.isFinite(parsed) ? parsed : null;
  }, [incomingCostInput]);

  // En compra el costo es obligatorio: una compra sin costo informado se
  // valoraria al promedio vigente y se comportaria como una entrada manual, que
  // es exactamente la contaminacion silenciosa que evita el CPP movil. Se bloquea
  // con un mensaje explicito en vez de degradar la operacion.
  //
  // La rama de costo negativo es defensa en profundidad, no una regla alcanzable
  // desde la interfaz: `sanitizeCostInput` ya rechaza el signo en captura. Se
  // conserva porque `parsedIncomingCost` tambien alimenta el submit y un valor
  // negativo persistido contaminaria el CPP hacia abajo sin aviso.
  const costError = useMemo(() => {
    if (!isPurchase) return null;

    if (!incomingCostInput.trim()) {
      return "Ingresa el costo unitario de compra para valorar el lote.";
    }

    if (parsedIncomingCost === null) {
      return "El costo debe ser un numero valido.";
    }

    if (parsedIncomingCost < 0) {
      return "El costo no puede ser negativo.";
    }

    return null;
  }, [isPurchase, incomingCostInput, parsedIncomingCost]);

  const projection = useMemo(() => {
    return projectIncomingCost({
      product: selectedProduct,
      quantity,
      entryMode,
      incomingCostPrice: parsedIncomingCost,
    });
  }, [selectedProduct, quantity, entryMode, parsedIncomingCost]);

  const handleEntryModeChange = useCallback((nextMode) => {
    if (nextMode !== ENTRY_MODE.PURCHASE && nextMode !== ENTRY_MODE.MANUAL) {
      return;
    }

    setEntryMode(nextMode);
  }, []);

  const handleIncomingCostChange = useCallback((event) => {
    const sanitized = sanitizeCostInput(event.target.value);

    // `null` significa "captura invalida": se ignora la pulsacion para no dejar
    // un texto a medio construir, en lugar de marcar un error por cada tecla.
    if (sanitized === null) return;

    setCostDraft((previous) => ({ ...previous, value: sanitized }));
  }, []);

  /**
   * `incomingCostPrice` que viajara al servicio de alta.
   *
   * En entrada manual es `undefined`: esa es la senal que deja el CPP intacto. En
   * compra es el numero capturado, ya validado.
   *
   * @returns {number|undefined}
   */
  const resolveIncomingCostPriceForSubmit = useCallback(() => {
    if (!isPurchase) return undefined;

    if (costError !== null) return undefined;

    return parsedIncomingCost;
  }, [isPurchase, costError, parsedIncomingCost]);

  return {
    entryMode,
    isPurchase,
    incomingCostInput,
    currentCost,
    costError,
    projection,
    setEntryMode: handleEntryModeChange,
    handleIncomingCostChange,
    resolveIncomingCostPriceForSubmit,
  };
};

export default useInventoryAddCost;
