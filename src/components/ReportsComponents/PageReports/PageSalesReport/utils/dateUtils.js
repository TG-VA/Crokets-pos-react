/**
 * Extrae el offset de una zona horaria en formato estricto ISO 8601 (ej. "-05:00" o "Z")
 * basándose en un instante seguro del día.
 */
export const getTimezoneOffset = (date, timeZone) => {
  const safeDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12));
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(safeDate);
  const tzPart = parts.find(part => part.type === 'timeZoneName')?.value;
  
  if (!tzPart || tzPart === 'GMT') return 'Z';
  
  const offset = tzPart.replace('GMT', '');
  const match = offset.match(/([+-])(\d+)(?::(\d+))?/);
  
  if (!match) throw new Error(`Offset de timezone inválido: ${tzPart}`);
  
  const sign = match[1];
  const hours = match[2].padStart(2, '0');
  const minutes = match[3] || '00';
  
  return `${sign}${hours}:${minutes}`;
};

/**
 * Extrae el Año, Mes y Día de una fecha basándose en la zona horaria del negocio,
 * ignorando el reloj local de la computadora.
 */
export const formatYMD = (d, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}-${month}-${day}`;
};