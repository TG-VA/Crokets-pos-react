/*
  Decide si un cambio Realtime de `products` o `departments` afecta al reporte
  que ya esta en pantalla. Las tablas no usan REPLICA IDENTITY FULL, asi que
  `old` solo trae la llave primaria: la comparacion se hace contra las filas
  cargadas, no contra el registro anterior.
*/

const hasProductChanged = (record, row) =>
  record.status !== true ||
  String(record.barcode ?? "") !== row.codigo ||
  String(record.name ?? "") !== row.nombre ||
  (record.department_id ?? null) !== (row.departmentId ?? null) ||
  (record.tracks_inventory !== false) !== row.tracksInventory;

export const isRelevantProductChange = (payload, rows = []) => {
  const eventType = payload?.eventType;

  if (eventType === "DELETE") {
    const productId = payload?.old?.id;
    return rows.some((row) => row.productId === productId);
  }

  const record = payload?.new;

  if (!record?.id) {
    return false;
  }

  const row = rows.find((item) => item.productId === record.id);

  if (!row) {
    return record.status === true;
  }

  return eventType === "INSERT" || hasProductChanged(record, row);
};

export const isRelevantDepartmentChange = (payload, rows = []) => {
  const eventType = payload?.eventType;

  if (eventType === "INSERT") {
    return false;
  }

  const departmentId =
    eventType === "DELETE" ? payload?.old?.id : payload?.new?.id;
  const departmentRows = rows.filter(
    (row) => departmentId && row.departmentId === departmentId
  );

  if (eventType === "DELETE") {
    return departmentRows.length > 0;
  }

  const name = String(payload?.new?.name ?? "");
  return departmentRows.some((row) => row.depto !== name);
};
