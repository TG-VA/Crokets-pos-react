/**
 * fiscalCustomerViewUtils.js
 * Deriva las clases de CSS de los campos del formulario fiscal.
 *
 * Es una funcion pura de presentacion: recibe los estados de campo y devuelve
 * el `className`, sin conocer React ni el modulo de estilos.
 */

/**
 * El input solo muestra su marca de estado cuando el campo ya fue tocado o
 * tiene contenido, para no pintar el formulario antes de que el usuario escriba.
 */
export const getFiscalInputClass = (
  styles,
  field,
  { form, touched, status }
) => {
  if (!touched[field] && !form[field]) return styles.input;

  if (status[field] === "valid") {
    return `${styles.input} ${styles.validInput}`;
  }

  if (status[field] === "invalid") {
    return `${styles.input} ${styles.invalidInput}`;
  }

  return styles.input;
};

/**
 * Los selectores nunca se marcan como invalidos: cuando faltan, la validacion
 * de guardado muestra el mensaje.
 */
export const getFiscalSelectClass = (
  styles,
  field,
  { form, touched, status }
) => {
  if (!touched[field] && !form[field]) return styles.input;

  if (status[field] === "valid") {
    return `${styles.input} ${styles.validInput}`;
  }

  return styles.input;
};
