/* ===================== */
/* FORMATTERS */
/* ===================== */

/** ₡15000 → ₡15.000 */
export const formatCRC = (value: number) => {
    return `₡${value.toLocaleString('es-CR')}`;
  };
  
  /** Fecha bonita en español */
  export const formatDateLong = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-CR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };
  
  /** Fecha corta (tablas) */
  export const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CR');
  };
  