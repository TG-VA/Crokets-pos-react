[OPEN] Debug Session: movements-week-month

## Síntoma
- En `Reporte de movimientos`, los botones `Semana` y `Mes` no cambian el resultado (no filtran por rango).

## Esperado
- `Semana`: filtra por lunes-domingo de la semana del día seleccionado.
- `Mes`: filtra por el mes del día seleccionado.

## Hipótesis (falsables)
- H1: `datePreset` sí cambia, pero el filtro no se aplica porque `soldAtDateKey` sale `null`/incorrecto en la mayoría de filas.
- H2: El rango calculado (`startKey`, `endKey`) para semana/mes sale `null` o fuera del formato `YYYY-MM-DD`.
- H3: La UI sí cambia el preset, pero algo lo revierte inmediatamente a `day` (por ejemplo, interacción con el DatePicker).
- H4: La comparación por strings (`currentKey >= startKey && currentKey <= endKey`) falla por diferencias de formato/uppercase/espacios.
- H5: `buildRowView()` usa una fuente de fecha distinta (sale_date vs created_at) y genera llaves que no coinciden con el rango.

## Evidencia a recolectar
- Eventos en click: preset seleccionado, selectedDay antes/después.
- Rango calculado y llaves (`startKey`, `endKey`) en cada cambio.
- Conteos: `rows.length`, `rowsForFacets.length`, `filteredRows.length`.
- Muestra de 5 `soldAtValue` y `soldAtDateKey` generados.

## Notas
- No remover instrumentación hasta confirmar el fix.
