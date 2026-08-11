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
 * Extrae el Año, Mes y Día de la fecha seleccionada tratándola como fecha de calendario pura.
 * Extraemos los componentes locales asumiendo que el DatePicker guarda la intención del usuario.
 */
export const formatYMD = (d) => {
  if (!d) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};