import { useState } from "react";

/**
 * Detecta si un valor de entrada cambio desde el render anterior y permite
 * ajustar el estado derivado en esa misma pasada de render.
 *
 * Sustituye al patron `useEffect(() => { setState(...) }, [clave])` cuando el
 * unico proposito del efecto es volver a poner el estado en su valor inicial
 * porque una entrada cambio. El ajuste ocurre durante el render, de modo que
 * React descarta la salida y vuelve a renderizar el componente antes de
 * confirmarla en pantalla: no hay un segundo render comprometido ni un
 * fotograma con el estado anterior visible, y no se dispara un setState
 * sincrono desde el cuerpo de un efecto.
 *
 * El valor devuelto es `true` durante exactamente una pasada de render (la
 * primera en la que se observa el cambio), por lo que las actualizaciones de
 * estado agrupadas dentro de ese bloque se combinan con el propio ajuste y no
 * generan un render adicional.
 *
 * @template T
 * @param {T} key - Valor a observar (un id de entidad, un booleano de apertura, etc.).
 * @returns {boolean} `true` si `key` cambio respecto del render anterior.
 *
 * @example
 * const isOpenChanged = useDidChange(isOpen);
 * if (isOpenChanged && isOpen) {
 *   setSearchTerm("");
 *   setResults([]);
 * }
 */
export const useDidChange = (key) => {
  const [previousKey, setPreviousKey] = useState(key);

  if (previousKey !== key) {
    setPreviousKey(key);
    return true;
  }

  return false;
};
