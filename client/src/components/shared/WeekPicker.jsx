import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { getWeekDates, getISOWeek } from '../../utils/formatters';

const WeekPicker = ({ week, year, onWeekChange, onDateRangeChange }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  useEffect(() => {
    const dates = getWeekDates(week, year);
    setStartDate(dates.start.toISOString().split('T')[0]);
    setEndDate(dates.end.toISOString().split('T')[0]);
    if (onDateRangeChange) {
      onDateRangeChange(dates.start, dates.end);
    }
  }, [week, year]);
  
  const handlePrevWeek = () => {
    let newWeek = week - 1;
    let newYear = year;
    if (newWeek < 1) {
      newWeek = 52;
      newYear--;
    }
    onWeekChange(newWeek, newYear);
  };
  
  const handleNextWeek = () => {
    let newWeek = week + 1;
    let newYear = year;
    if (newWeek > 52) {
      newWeek = 1;
      newYear++;
    }
    onWeekChange(newWeek, newYear);
  };
  
  const weekDates = getWeekDates(week, year);
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex gap-2">
            <Input
              type="number"
              value={week}
              onChange={(e) => onWeekChange(parseInt(e.target.value), year)}
              className="w-16 text-center"
              min="1"
              max="52"
            />
            <Input
              type="number"
              value={year}
              onChange={(e) => onWeekChange(week, parseInt(e.target.value))}
              className="w-20 text-center"
            />
          </div>
          
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Week {week} — {weekDates.formatted}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekPicker;