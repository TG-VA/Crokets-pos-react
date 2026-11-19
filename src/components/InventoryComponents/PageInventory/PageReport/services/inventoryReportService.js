import { supabase } from "../../../../../lib/supabaseClient";
import {
  fetchOperationalBranches,
  isOperationalBranch,
} from "../../../../../services/branchScopeService";

import { sortInventoryRows } from "./inventoryReportCalculationService";

// El RPC devuelve todo el reporte de la sucursal en un solo jsonb, asi que el
// limite de filas de PostgREST no lo trunca. row_kind distingue las filas de
// inventario de los productos sin registro (D2) y sin control de inventario.
const INVENTORY_REPORT_RPC = "get_branch_inventory_report";

// Ante un error al listar sucursales solo se ofrece la sucursal actual, y solo
// si es operativa: el selector nunca muestra sucursales que el catalogo no
// confirmo como operativas.
const buildBranchFallback = (currentBranch) => {
  if (!currentBranch?.id || !isOperationalBranch(currentBranch)) {
    return [];
  }

  return [
    {
      id: currentBranch.id,
      name: currentBranch.name || "Sucursal actual",
      code: currentBranch.code || "",
    },
  ];
};

const toNullableNumber = (value) => (value == null ? null : Number(value) || 0);

const mapBaseRow = (item) => ({
  inventoryRowId: item?.inventory_row_id ?? null,
  productId: item?.product_id ?? null,
  codigo: String(item?.barcode ?? ""),
  nombre: String(item?.name ?? ""),
  depto: String(item?.department_name ?? ""),
  departmentId: item?.department_id ?? null,
});

const mapInventoryRow = (item) => ({
  ...mapBaseRow(item),
  existencia: toNullableNumber(item?.stock) ?? 0,
  min: toNullableNumber(item?.min_stock) ?? 0,
  max: toNullableNumber(item?.max_stock) ?? 0,
  tracksInventory: item?.tracks_inventory !== false,
  noStockProduct: false,
  noBranchRecord: false,
});

// Sin fila activa en la sucursal: existencia, minimo y maximo quedan en null
// para no confundir el producto con un agotado.
const mapProductWithoutRow = (item, noBranchRecord) => ({
  ...mapBaseRow(item),
  existencia: null,
  min: null,
  max: null,
  tracksInventory: noBranchRecord,
  noStockProduct: !noBranchRecord,
  noBranchRecord,
});

const ROW_MAPPERS = {
  inventory: mapInventoryRow,
  no_branch_record: (item) => mapProductWithoutRow(item, true),
  no_stock: (item) => mapProductWithoutRow(item, false),
};

export const fetchBranchOptions = async (currentBranch) => {
  try {
    const { data, error } = await fetchOperationalBranches();

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    error.branchFallback = buildBranchFallback(currentBranch);
    throw error;
  }
};

export const getBranchOptionsFallback = (currentBranch) => {
  return buildBranchFallback(currentBranch);
};

export const fetchInventoryReportRows = async (branchId) => {
  if (!branchId) {
    return [];
  }

  const { data, error } = await supabase.rpc(INVENTORY_REPORT_RPC, {
    p_branch_id: branchId,
  });

  if (error) {
    throw error;
  }

  const rows = (Array.isArray(data) ? data : [])
    .filter((item) => item?.product_id && ROW_MAPPERS[item.row_kind])
    .map((item) => ROW_MAPPERS[item.row_kind](item));

  return sortInventoryRows(rows);
};
