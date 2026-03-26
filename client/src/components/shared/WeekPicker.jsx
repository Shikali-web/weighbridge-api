import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getWeekDates } from '../../utils/formatters';
import { Button } from '../ui/button';

const WeekPicker = ({ week, year, onChange }) => {
  const handlePrevWeek = () => {
    let newWeek = week - 1;
    let newYear = year;
    if (newWeek < 1) {
      newWeek = 52;
      newYear--;
    }
    onChange(newWeek, newYear);
  };

  const handleNextWeek = () => {
    let newWeek = week + 1;
    let newYear = year;
    if (newWeek > 52) {
      newWeek = 1;
      newYear++;
    }
    onChange(newWeek, newYear);
  };

  const weekDates = getWeekDates(week, year);

  return (
    <div className="flex items-center gap-4 bg-white rounded-lg shadow p-4">
      <Button variant="outline" size="sm" onClick={handlePrevWeek}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex gap-2">
        <input
          type="number"
          value={week}
          onChange={(e) => onChange(parseInt(e.target.value), year)}
          className="w-16 px-2 py-1 border rounded text-center"
          min="1"
          max="52"
        />
        <input
          type="number"
          value={year}
          onChange={(e) => onChange(week, parseInt(e.target.value))}
          className="w-20 px-2 py-1 border rounded text-center"
        />
      </div>
      
      <Button variant="outline" size="sm" onClick={handleNextWeek}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      
      <div className="ml-4 text-sm text-gray-600">
        Week {week} — {weekDates.formatted}
      </div>
    </div>
  );
};

export default WeekPicker;