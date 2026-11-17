import { RECEIPT_COST_MAX } from "./ordersCalculationService";

/**
 * Sanitiza una cantidad capturada en los formularios de pedidos.
 * El inventario solo admite unidades enteras, por lo que la mascara conserva
 * unicamente la parte entera: el campo controlado muestra siempre el valor que
 * se guarda en el estado, y tanto `ordersService` como la RPC rechazan
 * cualquier cantidad fraccionaria que llegue por otra via.
 *
 * Una captura negativa se descarta completa en vez de quedarse con sus digitos:
 * convertir `-3` en `3` inventaria una entrada que el usuario no pidio.
 */
export const sanitizeIntegerQuantity = (value) => {
  const text = String(value ?? "").trim();

  if (text.startsWith("-") || text.startsWith("\u2212")) return "";

  const raw = text.replace(/[^\d.,]/g, "");
  const integerPart = raw.split(/[.,]/)[0] ?? "";
  const digits = integerPart.replace(/\D/g, "");

  if (!digits) return "";

  return digits.replace(/^0+(?=\d)/, "");
};

const COST_INPUT_PATTERN = /^\d*\.?\d{0,2}$/;

/**
 * Sanitiza el costo unitario capturado al recibir un pedido.
 * Admite digitos con hasta dos decimales (la coma se toma como punto), igual
 * que el alta de inventario: el costo entra al CPP redondeado a 2 decimales.
 * Una captura invalida (signo, letras, un tercer decimal) devuelve `null` para
 * que el formulario conserve el valor anterior en lugar de borrarlo. Lo mismo
 * aplica a un costo mayor a `RECEIPT_COST_MAX`: si se aceptara, el campo
 * mostraria el valor pero la recepcion lo contaria como costo faltante.
 */
export const sanitizeCostInput = (value) => {
  const text = String(value ?? "")
    .replace(",", ".")
    .trim();

  if (!text) return "";

  if (!COST_INPUT_PATTERN.test(text)) return null;

  return Number(text) > RECEIPT_COST_MAX ? null : text;
};
