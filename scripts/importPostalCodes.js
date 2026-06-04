import "dotenv/config";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const FILE_PATH = "./CPdescarga.xlsx";
const BATCH_SIZE = 1000;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan variables SUPABASE.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const normalizePostalCode = (value) => {
  if (value === undefined || value === null) return null;
  return String(value).trim().padStart(5, "0").slice(0, 5);
};

const chunkArray = (array, size) => {
  const chunks = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
};

const importPostalCodes = async () => {
  console.log("Leyendo archivo SEPOMEX...");

  const workbook = XLSX.readFile(FILE_PATH);
  const rowsToInsert = [];

  workbook.SheetNames.forEach((sheetName) => {
    if (sheetName.toLowerCase().includes("nota")) return;

    console.log(`Procesando hoja: ${sheetName}`);

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
    });

    rows.forEach((row) => {
      const postalCode = normalizePostalCode(row.d_codigo);
      const settlement = normalizeText(row.d_asenta);
      const municipality = normalizeText(row.D_mnpio);
      const state = normalizeText(row.d_estado);

      if (!postalCode || !settlement || !municipality || !state) return;

      rowsToInsert.push({
        postal_code: postalCode,
        settlement,
        settlement_type: normalizeText(row.d_tipo_asenta),
        municipality,
        state,
        city: normalizeText(row.d_ciudad),
        zone_type: normalizeText(row.d_zona),
        status: true,
        updated_at: new Date().toISOString(),
      });
    });
  });

console.log(`Registros leídos: ${rowsToInsert.length}`);

const uniqueRowsMap = new Map();

for (const row of rowsToInsert) {
  const key = [
    row.postal_code,
    row.settlement,
    row.municipality,
    row.state,
  ]
    .map((value) => String(value || "").toUpperCase().trim())
    .join("|");

  uniqueRowsMap.set(key, row);
}

const uniqueRows = Array.from(uniqueRowsMap.values());

console.log(`Registros únicos preparados: ${uniqueRows.length}`);
console.log(`Duplicados omitidos: ${rowsToInsert.length - uniqueRows.length}`);

const batches = chunkArray(uniqueRows, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    console.log(`Insertando lote ${i + 1} de ${batches.length}...`);

    const { error } = await supabase
      .from("postal_codes")
      .upsert(batch, {
        onConflict: "postal_code,settlement,municipality,state",
      });

    if (error) {
      console.error("Error insertando lote:", error);
      process.exit(1);
    }
  }

  console.log("Catálogo postal importado correctamente.");
};

importPostalCodes();