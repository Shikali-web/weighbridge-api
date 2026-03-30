// Format currency
export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'KES 0.00';
  return `KES ${Number(value).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

// Format tons
export const formatTons = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0.000 T';
  return `${Number(value).toLocaleString('en-KE', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })} T`;
};

// Get week number from date (Friday to Thursday week)
export const getISOWeek = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Adjust to get the Thursday of the current week
  const dayOfWeek = d.getDay();
  const thursday = new Date(d);
  thursday.setDate(d.getDate() + (4 - dayOfWeek));
  // Get the first Thursday of the year
  const firstThursday = new Date(thursday.getFullYear(), 0, 1);
  while (firstThursday.getDay() !== 4) {
    firstThursday.setDate(firstThursday.getDate() + 1);
  }
  const diffDays = Math.floor((thursday - firstThursday) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
};

// Get week dates from week number and year
export const getWeekDates = (week, year) => {
  // Find the first Thursday of the year
  const firstThursday = new Date(year, 0, 1);
  while (firstThursday.getDay() !== 4) {
    firstThursday.setDate(firstThursday.getDate() + 1);
  }
  // Calculate the Friday (week start)
  const weekStart = new Date(firstThursday);
  weekStart.setDate(firstThursday.getDate() + (week - 1) * 7 - 1);
  // Thursday is week end
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  return {
    start: weekStart,
    end: weekEnd,
    formatted: `${weekStart.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })} - ${weekEnd.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}`
  };
};