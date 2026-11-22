---
name: audit-pr
description: Audita un Pull Request de Crokets-POS delegando en el subagente pr-auditor. Usar con /audit-pr <numero> [--security].
argument-hint: <numero-de-pr> [--security]
---

# Auditar PR

Argumento recibido: `$ARGUMENTS`

1. Si `$ARGUMENTS` no contiene un numero de PR, pide el numero al usuario y detente.
2. Lanza el subagente `pr-auditor` con la herramienta Agent (`subagent_type: "pr-auditor"`) y el prompt: `Audita el PR #<numero>.` Si `$ARGUMENTS` incluye `--security`, usa `Audita el PR #<numero> --security.`
3. No audites el PR por tu cuenta mientras el subagente trabaja.
4. Al terminar, resume al usuario el veredicto y el enlace al comentario final de auditoria que reporte el subagente.
