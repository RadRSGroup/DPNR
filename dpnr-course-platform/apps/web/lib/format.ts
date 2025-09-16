export function formatDate(d: Date | string | number, locale: string = 'en-US') {
  const date = d instanceof Date ? d : new Date(d);
  const fmt = new Intl.DateTimeFormat(
    locale === 'he' || locale.startsWith('he') ? 'he-IL' : locale,
    { day: '2-digit', month: '2-digit', year: 'numeric' }
  );
  return fmt.format(date);
}

export function formatCurrency(amount: number, locale: string = 'en-US', currency: string = 'ILS') {
  const loc = locale === 'he' || locale.startsWith('he') ? 'he-IL' : locale;
  return new Intl.NumberFormat(loc, { style: 'currency', currency }).format(amount);
}

