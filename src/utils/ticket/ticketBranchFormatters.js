import {
  TICKET_WIDTH,
  normalizeSpaces,
  normalizeUpper,
  wrapText,
} from "./ticketLayoutFormatters";

export const formatStateShort = (state = "") => {
  const clean = normalizeUpper(state);

  const map = {
    "QUINTANA ROO": "QROO",
    "Q. ROO": "QROO",
    QUERETARO: "QRO",
    "CIUDAD DE MEXICO": "CDMX",
    "ESTADO DE MEXICO": "EDOMEX",
    "NUEVO LEON": "NL",
    JALISCO: "JAL",
    YUCATAN: "YUC",
  };

  return map[clean] || clean;
};

export const extractPostalCode = (address = "") => {
  const clean = normalizeSpaces(address);
  const match = clean.match(/\b\d{5}\b/);
  return match ? match[0] : "";
};

export const removePostalCode = (address = "") => {
  return normalizeSpaces(address).replace(/\b\d{5}\b/g, "").trim();
};

export const normalizeAddressLine1 = (address = "") => {
  return removePostalCode(address)
    .toUpperCase()
    .replace(/\s*,\s*/g, " ")
    .replace(/\s*-\s*/g, " ")
    .replace(/\bNO\b\.?/g, "NO.")
    .replace(/\bMZA\b\.?/g, "MZ")
    .replace(/\bMANZANA\b/g, "MZ")
    .replace(/\bLOTE\b/g, "LT")
    .replace(/\bLT\b\.?/g, "LT")
    .replace(/\bMZ\b\.?/g, "MZ")
    .replace(/\s+/g, " ")
    .trim();
};

export const formatBranchAddressLines = (branch = {}) => {
  const rawAddress = branch.address || "";
  const city = normalizeUpper(branch.city || "");
  const state = formatStateShort(branch.state || "");
  const postalCode =
    extractPostalCode(rawAddress) ||
    extractPostalCode(branch.postal_code || "") ||
    extractPostalCode(branch.zip_code || "");

  const addressLine1 = normalizeAddressLine1(rawAddress);
  const addressLine2 = [
    city ? `${city},` : "",
    state,
    postalCode ? `CP ${postalCode}` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const result = [];

  if (addressLine1) {
    const wrappedAddress = wrapText(addressLine1, TICKET_WIDTH);
    wrappedAddress.forEach((line) => result.push(line));
  }

  if (addressLine2) {
    const wrappedLine2 = wrapText(addressLine2, TICKET_WIDTH);
    wrappedLine2.forEach((line) => result.push(line));
  }

  return result;
};
