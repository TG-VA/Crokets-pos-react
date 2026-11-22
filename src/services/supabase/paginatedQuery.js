// PostgREST corta cada respuesta en 1000 filas sin devolver error (max-rows),
// y un .limit(N > 1000) no lo evita. Estas utilidades leen todas las filas.
export const DEFAULT_PAGE_SIZE = 1000;

// Un .in() con miles de UUID rebasa el largo maximo de URL.
export const DEFAULT_IN_FILTER_BATCH_SIZE = 200;

// Las consultas se leen por paginas con un cursor sobre id (keyset): cada pagina
// pide las filas con id mayor al ultimo leido, hasta que una llega incompleta.
// A diferencia de .range(), un insert o un borrado entre paginas no repite ni
// salta filas. El orden de lectura no importa: el llamador ordena al final.
// Las tablas sin id pasan su llave unica en cursorColumn.
export const fetchAllPages = async (
  buildQuery,
  { pageSize = DEFAULT_PAGE_SIZE, cursorColumn = "id" } = {}
) => {
  const rows = [];
  let lastId = null;

  for (;;) {
    let query = buildQuery().order(cursorColumn, { ascending: true });

    if (lastId !== null) {
      query = query.gt(cursorColumn, lastId);
    }

    const { data, error } = await query.limit(pageSize);

    if (error) {
      return { data: null, error };
    }

    const page = Array.isArray(data) ? data : [];
    rows.push(...page);

    const nextId = page[page.length - 1]?.[cursorColumn];

    if (page.length < pageSize) {
      return { data: rows, error: null };
    }

    // Sin id no hay cursor: cortar aqui devolveria datos truncados como exito.
    if (nextId === undefined || nextId === null) {
      return {
        data: null,
        error: new Error(
          `fetchAllPages: fila sin ${cursorColumn}, no se puede paginar`
        ),
      };
    }

    lastId = nextId;
  }
};

// Un lote con mas de 1000 coincidencias choca con el tope de filas. Los ids se
// parten en lotes y cada lote se pagina; el primer error corta la lectura completa.
export const fetchByIdsInBatches = async (
  values,
  buildQuery,
  {
    batchSize = DEFAULT_IN_FILTER_BATCH_SIZE,
    pageSize = DEFAULT_PAGE_SIZE,
    cursorColumn = "id",
  } = {}
) => {
  const batches = [];

  for (let start = 0; start < values.length; start += batchSize) {
    batches.push(values.slice(start, start + batchSize));
  }

  const results = await Promise.all(
    batches.map((batch) =>
      fetchAllPages(() => buildQuery(batch), { pageSize, cursorColumn })
    )
  );

  const failed = results.find((result) => result.error);

  if (failed) {
    return { data: null, error: failed.error };
  }

  return { data: results.flatMap((result) => result.data), error: null };
};

// Las RPC que devuelven listas no admiten cursor sobre id: se paginan por offset
// con .range() hasta recibir una pagina incompleta. El llamador debe pasar un
// .order() estable en buildRpc para que las paginas no repitan ni salten filas.
export const fetchAllRpcPages = async (
  buildRpc,
  { pageSize = DEFAULT_PAGE_SIZE } = {}
) => {
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildRpc().range(from, from + pageSize - 1);

    if (error) {
      return { data: null, error };
    }

    const page = Array.isArray(data) ? data : [];
    rows.push(...page);

    if (page.length < pageSize) {
      return { data: rows, error: null };
    }
  }
};
