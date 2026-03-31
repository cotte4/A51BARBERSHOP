/** Parsea un string de fecha evitando problemas de offset UTC.
 *  Si es una fecha ISO pura (YYYY-MM-DD), le agrega T12:00:00 para que
 *  new Date() no la interprete como medianoche UTC.
 */
function toDate(date: Date | string): Date {
  if (typeof date === 'string') {
    // Solo fecha sin tiempo: agregar mediodía para evitar desfase UTC
    return /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(date + 'T12:00:00')
      : new Date(date)
  }
  return date
}

export function formatFecha(date: Date | string | null | undefined): string {
  if (!date) return '-'
  return toDate(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires'
  })
}

export function formatFechaHora(date: Date | string | null | undefined): string {
  if (!date) return '-'
  return toDate(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires'
  })
}
