/**
 * customerPointsCalculationService.js
 * Matematica de saldo de puntos compartida por las pantallas de Clientes.
 *
 * El saldo no se guarda: se deriva sumando los movimientos de `customer_points`.
 * La tabla solo admite `earn` y `redeem` (CHECK) y guarda los canjes con
 * `points` negativo, de modo que la suma directa ya descuenta. Como el mismo
 * calculo lo necesitan la consulta de recompensas y el ajuste manual, vive aqui
 * para que ambas pantallas no puedan divergir.
 */

/**
 * Saldo de puntos de un cliente a partir de sus movimientos.
 *
 * @param {Array<{points?: number}>} movements
 * @returns {number} Suma con signo de los movimientos.
 */
export const calculatePointsBalance = (movements = []) => {
  return movements.reduce((sum, movement) => {
    return sum + Number(movement?.points || 0);
  }, 0);
};
