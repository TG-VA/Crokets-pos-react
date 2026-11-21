#!/usr/bin/env bash
# Verificaciones de un PR en el directorio actual (worktree del PR).
# Uso: scripts/prVerify.sh <base-ref>
# Corre la suite, el build, el chequeo de AGENTS.md, Prettier y ESLint sobre
# los archivos del diff contra <base-ref> (incluye cambios sin commitear, igual que CI).
# Imprime la salida real de cada paso y al final una tabla de resultados. Sale con 1 si algun paso falla.

set -u

BASE="${1:-}"
if [ -z "$BASE" ]; then
  echo "Uso: scripts/prVerify.sh <base-ref>" >&2
  exit 2
fi

FILES=()
while IFS= read -r f; do
  [ -f "$f" ] && FILES+=("$f")
done < <(git diff --name-only --diff-filter=ACMR "$(git merge-base "$BASE" HEAD)")

LINT_FILES=()
FORMAT_FILES=()
for f in "${FILES[@]+"${FILES[@]}"}"; do
  case "$f" in
    *.js | *.jsx | *.mjs) LINT_FILES+=("$f") ;;
  esac
  case "$f" in
    *.js | *.jsx | *.mjs | *.css | *.json | *.md) FORMAT_FILES+=("$f") ;;
  esac
done

RESULTS=()
FAILED=0

run_step() {
  local name="$1"
  shift
  echo "===== $name ====="
  if "$@"; then
    RESULTS+=("| $name | OK |")
  else
    RESULTS+=("| $name | FALLO |")
    FAILED=1
  fi
  echo
}

run_step "npm test" npm test
run_step "build:frontend" npm run build:frontend
run_step "checkAgentsCompliance" node scripts/checkAgentsCompliance.mjs "$BASE"

if [ ${#FORMAT_FILES[@]} -gt 0 ]; then
  run_step "prettier --check" npx prettier --check "${FORMAT_FILES[@]}"
else
  RESULTS+=("| prettier --check | N/A (sin archivos) |")
fi

if [ ${#LINT_FILES[@]} -gt 0 ]; then
  run_step "eslint" npx eslint "${LINT_FILES[@]}"
else
  RESULTS+=("| eslint | N/A (sin archivos) |")
fi

echo "===== Resumen (base: $BASE, archivos en diff: ${#FILES[@]}) ====="
echo "| Paso | Resultado |"
echo "| --- | --- |"
printf '%s\n' "${RESULTS[@]}"

exit $FAILED
