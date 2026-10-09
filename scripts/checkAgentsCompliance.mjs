import { execSync } from "child_process";
import fs from "fs";

/**
 * Script de verificacion automatica de estandares de AGENTS.md.
 *
 * Valida sobre el diff incremental:
 * 1. Cero emojis en codigo, UI, comentarios o logs.
 * 2. Cero `!important` en archivos CSS (*.module.css y *.css).
 * 3. Cero `console.log` o `console.warn` de depuracion en `src/` y `electron/`.
 * 4. Salto de linea obligatorio al final de cada archivo (EOF newline).
 */

function resolveBaseRef() {
  if (process.argv[2]) {
    return process.argv[2];
  }

  try {
    execSync("git rev-parse --verify origin/main", { stdio: "ignore" });
    return "origin/main";
  } catch {
    return "HEAD";
  }
}

function isBinaryOrIgnored(file) {
  const ignoredExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".xlsx",
    ".xls",
    ".pdf",
    ".zip",
    ".dmg",
    ".blockmap",
    ".lock",
  ];
  return (
    ignoredExtensions.some((ext) => file.endsWith(ext)) ||
    file.includes("package-lock.json")
  );
}

function runComplianceCheck() {
  const baseRef = resolveBaseRef();
  const violations = [];

  let diffText = "";
  let changedFiles = [];

  try {
    diffText = execSync(`git diff -U0 --diff-filter=ACM "${baseRef}"`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    console.error(
      "Error obteniendo el diff para verificacion de AGENTS:",
      error.message
    );
    process.exit(1);
  }

  try {
    const rawFiles = execSync(
      `git diff --name-only --diff-filter=ACM "${baseRef}"`,
      { encoding: "utf-8" }
    );
    changedFiles = rawFiles
      .trim()
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
  } catch (error) {
    console.error(
      "Error obteniendo lista de archivos modificados:",
      error.message
    );
    process.exit(1);
  }

  if (changedFiles.length === 0) {
    console.log(
      "[OK] No hay archivos modificados para validar contra " + baseRef
    );
    process.exit(0);
  }

  // 1. Verificacion de EOF Newline en cada archivo modificado
  for (const file of changedFiles) {
    if (isBinaryOrIgnored(file) || !fs.existsSync(file)) continue;

    try {
      const buffer = fs.readFileSync(file);
      if (buffer.length > 0 && buffer[buffer.length - 1] !== 0x0a) {
        violations.push({
          file,
          rule: "EOF Newline",
          message:
            "El archivo no finaliza con un salto de linea en blanco (EOF newline).",
        });
      }
    } catch (err) {
      console.error(`Error leyendo archivo ${file}:`, err.message);
    }
  }

  // 2. Analisis linea por linea del diff
  const emojiRegex = /\p{Extended_Pictographic}/u;
  const consoleLogRegex = /\bconsole\.(log|warn)\s*\(/;
  const lines = diffText.split("\n");

  let currentFile = null;

  for (const line of lines) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6).trim();
      continue;
    }

    if (!line.startsWith("+") || line.startsWith("+++")) {
      continue;
    }

    const addedContent = line.slice(1);

    if (!currentFile || isBinaryOrIgnored(currentFile)) {
      continue;
    }

    // Regla: Cero Emojis
    if (emojiRegex.test(addedContent)) {
      violations.push({
        file: currentFile,
        rule: "Cero Emojis",
        message: `Se detecto caracter emoji en la linea: "${addedContent.trim()}"`,
      });
    }

    // Regla: Cero !important en CSS
    if (currentFile.endsWith(".css") && addedContent.includes("!important")) {
      violations.push({
        file: currentFile,
        rule: "Cero !important",
        message: `Uso no permitido de !important en: "${addedContent.trim()}"`,
      });
    }

    // Regla: Cero console.log / console.warn en src/ y electron/
    const isSourceCode =
      (currentFile.startsWith("src/") || currentFile.startsWith("electron/")) &&
      /\.(js|jsx|mjs)$/.test(currentFile);

    if (isSourceCode && consoleLogRegex.test(addedContent)) {
      violations.push({
        file: currentFile,
        rule: "Limpieza de Logs (console.log / console.warn)",
        message: `Log de depuracion detectado: "${addedContent.trim()}". (Usa console.error solo en bloques catch).`,
      });
    }
  }

  if (violations.length > 0) {
    console.error(
      "\n[ERROR] Se encontraron infracciones a las reglas de AGENTS.md:\n"
    );
    for (const v of violations) {
      console.error(`  [${v.rule}] ${v.file}`);
      console.error(`    ↳ ${v.message}\n`);
    }
    console.error(
      `Total de infracciones: ${violations.length}. Por favor corrigelas antes de hacer merge.\n`
    );
    process.exit(1);
  }

  console.log(
    `[OK] Verificacion de AGENTS.md completada con exito (0 emojis, 0 !important, 0 console.log/warn, EOF newlines conformes).`
  );
  process.exit(0);
}

runComplianceCheck();
