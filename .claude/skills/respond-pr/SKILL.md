---
name: respond-pr
description: Atiende los hallazgos de las reviews de un Pull Request de Crokets-POS delegando en el subagente pr-review-responder. Usar con /respond-pr <numero>.
argument-hint: <numero-de-pr>
---

# Atender reviews de un PR

Argumento recibido: `$ARGUMENTS`

1. Si `$ARGUMENTS` no contiene un numero de PR, pide el numero al usuario y detente.
2. Lanza el subagente `pr-review-responder` con la herramienta Agent (`subagent_type: "pr-review-responder"`) y el prompt: `Atiende las reviews del PR #<numero>.`
3. No atiendas el PR por tu cuenta mientras el subagente trabaja.
4. Al terminar, resume al usuario los conteos por decision, los commits empujados, los hilos que quedaron abiertos, que se actualizo en la descripcion del PR (el subagente debe actualizarla siempre que haya cambios) y el enlace al comentario final que reporte el subagente.
