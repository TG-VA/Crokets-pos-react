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
