export const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'KES 0.00';
  return `KES ${Number(value).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

export const formatTons = (value) => {
  if (value === null || value === undefined) return '0.000 T';
  return `${Number(value).toLocaleString('en-KE', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })} T`;
};

export const getWeekDates = (week, year) => {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = simple.getDay();
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    start: monday,
    end: sunday,
    formatted: `${monday.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}`
  };
};

export const getISOWeek = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};