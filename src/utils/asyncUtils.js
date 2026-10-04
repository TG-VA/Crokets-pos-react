/**
 * asyncUtils.js
 * Utilidades de concurrencia acotada para servicios de datos.
 */

/**
 * Ejecuta `mapper` sobre `items` manteniendo como maximo `limit` promesas en
 * vuelo, y devuelve los resultados en el mismo orden que `items`.
 *
 * Si `mapper` rechaza, `mapWithConcurrency` rechaza con ese error.
 */
export const mapWithConcurrency = async (items = [], limit = 1, mapper) => {
  const results = new Array(items.length);
  const workerCount = Math.min(Math.max(limit, 1), items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await mapper(items[current], current);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
};

/**
 * Ejecuta `task` despues de que React haya confirmado el render actual.
 *
 * Sirve para el patron "un efecto arranca un trabajo que escribe estado": si las
 * escrituras ocurren en el cuerpo del efecto, React confirma un segundo render en
 * cascada antes de que exista el dato. Envolviendolas en un microtask, el trabajo
 * corre cuando el commit actual ya esta firme, y las escrituras caen en una
 * continuacion asincrona legitima.
 *
 * No es un IIFE: la tarea se agenda de forma explicita y por eso sigue siendo
 * cancelable desde el cleanup del efecto.
 */
export const afterCommit = (task) => {
  return Promise.resolve().then(task);
};
