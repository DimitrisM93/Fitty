export function getLocalISODate(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getGreekTodayStr() {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Athens',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(new Date());
    const y = parts.find(p => p.type === 'year').value.replace(/\D/g, '');
    const m = parts.find(p => p.type === 'month').value.replace(/\D/g, '').padStart(2, '0');
    const d = parts.find(p => p.type === 'day').value.replace(/\D/g, '').padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch (err) {
    // Fallback if browser blocks timezone formatting (e.g. privacy browsers)
    return getLocalISODate();
  }
}
