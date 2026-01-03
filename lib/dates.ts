// lib/dates.ts

export const toLocalISODate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  
  export const formatDateSpanish = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-CR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };
  
  export const formatMonthLabel = (date: Date) =>
    date.toLocaleDateString('es-CR', {
      month: 'long',
      year: 'numeric',
    });
  