import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const WeekPicker = ({ week, year, onWeekChange, onDateRangeChange }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const getWeekDates = (weekNum, yearNum) => {
    const simple = new Date(yearNum, 0, 1 + (weekNum - 1) * 7);
    const dayOfWeek = simple.getDay();
    const monday = new Date(simple);
    monday.setDate(simple.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      start: monday,
      end: sunday,
      formatted: `${monday.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })} - ${sunday.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}`
    };
  };
  
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
          
          <div className="flex gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                // Calculate week from selected date
                const date = new Date(e.target.value);
                const newWeek = getWeekNumber(date);
                const newYear = date.getFullYear();
                onWeekChange(newWeek, newYear);
              }}
              className="w-36"
            />
            <span className="text-gray-500">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                const date = new Date(e.target.value);
                const newWeek = getWeekNumber(date);
                const newYear = date.getFullYear();
                onWeekChange(newWeek, newYear);
              }}
              className="w-36"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get week number from date
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

export default WeekPicker;