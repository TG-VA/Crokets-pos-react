export const TICKET_WIDTH = 32;

export const separator = (char = "-") => char.repeat(TICKET_WIDTH);
export const strongSeparator = (char = "=") => char.repeat(TICKET_WIDTH);

export const centerText = (text = "", width = TICKET_WIDTH) => {
  const clean = String(text ?? "");
  if (clean.length >= width) return clean;
  const left = Math.floor((width - clean.length) / 2);
  const right = width - clean.length - left;
  return " ".repeat(left) + clean + " ".repeat(right);
};

export const money = (value) => {
  const number = Number(value || 0);
  return `$${number.toFixed(2)}`;
};

export const normalizeSpaces = (text = "") =>
  String(text ?? "").replace(/\s+/g, " ").trim();

export const normalizeUpper = (text = "") => normalizeSpaces(text).toUpperCase();

export const wrapText = (text = "", width = TICKET_WIDTH) => {
  const clean = normalizeSpaces(text);
  if (!clean) return [""];

  const words = clean.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;

    if (test.length <= width) {
      current = test;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    if (word.length > width) {
      let remaining = word;

      while (remaining.length > width) {
        lines.push(remaining.slice(0, width));
        remaining = remaining.slice(width);
      }

      current = remaining;
    } else {
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
};

export const padRight = (text = "", width = 0) => {
  const clean = String(text ?? "");
  if (clean.length >= width) return clean.slice(0, width);
  return clean + " ".repeat(width - clean.length);
};

export const padLeft = (text = "", width = 0) => {
  const clean = String(text ?? "");
  if (clean.length >= width) return clean.slice(0, width);
  return " ".repeat(width - clean.length) + clean;
};

export const formatItemLine = (qty = "", description = "", amount = "") => {
  const qtyWidth = 5;
  const gapWidth = 1;
  const amountWidth = 9;
  const descWidth = TICKET_WIDTH - qtyWidth - gapWidth - amountWidth;

  const qtyText = padRight(qty, qtyWidth);
  const descText = padRight(description, descWidth);
  const amountText = padLeft(amount, amountWidth);

  return `${qtyText}${descText}${" ".repeat(gapWidth)}${amountText}`;
};

export const formatTotalLine = (label = "", value = "") => {
  const valueText = String(value ?? "");
  const labelWidth = TICKET_WIDTH - valueText.length;
  return padRight(label, labelWidth) + valueText;
};

export const pushItemDetailLines = (lines, text = "") => {
  const indent = "     ";
  const width = TICKET_WIDTH - indent.length;

  wrapText(text, width).forEach((line) => {
    lines.push(`${indent}${line}`);
  });
};

export const pushWrappedLeft = (lines, text = "", width = TICKET_WIDTH) => {
  wrapText(text, width).forEach((line) => {
    lines.push(line);
  });
};
