import { useCallback, useState } from "react";

/** Marca que ningun recurso ha sido resuelto todavia. */
export const NO_REQUEST_SETTLED = null;

/**
 * Estado de carga derivado de una clave de peticion, para lecturas que se
 * disparan desde un efecto.
 *
 * El patron que reemplaza es `setLoading(true)` al inicio de la carga. Ese
 * setState ocurre de forma sincrona dentro del cuerpo del efecto y obliga a
 * React a confirmar un segundo render en cascada antes de que la peticion llegue
 * a la red. Aqui la carga no se marca: se *deriva*. Se guarda unicamente la
 * clave que ya quedo resuelta y `isLoading` es la comparacion entre esa clave y
 * la que se esta pidiendo, de modo que el indicador de carga aparece en la misma
 * pasada de render en la que cambian los filtros, sin setState alguno.
 *
 * Las escrituras de estado del propio efecto (datos, error) pueden seguir siendo
 * las de siempre: no hace falta reescribir la logica de la consulta.
 *
 * @param {unknown} requestKey - Clave que identifica la carga pedida. Debe ser un
 *   valor primitivo o una referencia estable: cambiar de identidad dispara una
 *   nueva carga, igual que haria una dependencia de efecto.
 * @returns {{
 *   isLoading: boolean,
 *   isStale: boolean,
 *   settledKey: unknown,
 *   markSettled: () => void
 * }} `isLoading`/`isStale` indican que los datos en pantalla todavia no
 *   corresponden a `requestKey`; `markSettled` debe invocarse desde la
 *   continuacion asincrona de la consulta, una vez escritos los datos.
 */
export const useRequestStatus = (requestKey) => {
  const [settledKey, setSettledKey] = useState(NO_REQUEST_SETTLED);

  const isStale = settledKey !== requestKey;
  const markSettled = useCallback(() => {
    setSettledKey(requestKey);
  }, [requestKey]);

  return { isLoading: isStale, isStale, settledKey, markSettled };
};
