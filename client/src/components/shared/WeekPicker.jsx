import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, CalendarDays } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

// Helper function to get week number from date (Friday to Thursday week)
const getWeekNumber = (date) => {
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

// Helper function to get week dates from week number and year
const getWeekDates = (week, year) => {
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
  return { start: weekStart, end: weekEnd };
};

const WeekPicker = ({ week, year, onChange }) => {
  const [localWeek, setLocalWeek] = useState(week);
  const [localYear, setLocalYear] = useState(year);
  const [weekDates, setWeekDates] = useState({ start: null, end: null });
  const [datePickerValue, setDatePickerValue] = useState('');

  useEffect(() => {
    setLocalWeek(week);
    setLocalYear(year);
    const dates = getWeekDates(week, year);
    setWeekDates(dates);
  }, [week, year]);

  const handlePrevWeek = () => {
    let newWeek = localWeek - 1;
    let newYear = localYear;
    if (newWeek < 1) {
      newWeek = 52;
      newYear--;
    }
    setLocalWeek(newWeek);
    setLocalYear(newYear);
    onChange(newWeek, newYear);
  };

  const handleNextWeek = () => {
    let newWeek = localWeek + 1;
    let newYear = localYear;
    if (newWeek > 52) {
      newWeek = 1;
      newYear++;
    }
    setLocalWeek(newWeek);
    setLocalYear(newYear);
    onChange(newWeek, newYear);
  };

  const handleWeekInputChange = (e) => {
    let newWeek = parseInt(e.target.value);
    if (isNaN(newWeek)) newWeek = 1;
    if (newWeek < 1) newWeek = 1;
    if (newWeek > 52) newWeek = 52;
    setLocalWeek(newWeek);
    onChange(newWeek, localYear);
  };

  const handleYearInputChange = (e) => {
    let newYear = parseInt(e.target.value);
    if (isNaN(newYear)) newYear = new Date().getFullYear();
    setLocalYear(newYear);
    onChange(localWeek, newYear);
  };

  const handleDateRangeChange = (e) => {
    const date = new Date(e.target.value);
    if (!isNaN(date.getTime())) {
      const newWeek = getWeekNumber(date);
      const newYear = date.getFullYear();
      setLocalWeek(newWeek);
      setLocalYear(newYear);
      onChange(newWeek, newYear);
      setDatePickerValue(e.target.value);
    }
  };

  const handleCurrentWeek = () => {
    const today = new Date();
    const currentWeek = getWeekNumber(today);
    const currentYear = today.getFullYear();
    setLocalWeek(currentWeek);
    setLocalYear(currentYear);
    onChange(currentWeek, currentYear);
    setDatePickerValue('');
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrevWeek}
            className="p-2"
            title="Previous Week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex gap-2">
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-1">Week</span>
              <Input
                type="number"
                value={localWeek}
                onChange={handleWeekInputChange}
                className="w-16 text-center"
                min="1"
                max="52"
              />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-1">Year</span>
              <Input
                type="number"
                value={localYear}
                onChange={handleYearInputChange}
                className="w-20 text-center"
                min="2020"
                max="2030"
              />
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNextWeek}
            className="p-2"
            title="Next Week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCurrentWeek}
            className="ml-2"
            title="Go to Current Week"
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            Current Week
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Week {localWeek} — {weekDates.start && weekDates.end ? `${formatDate(weekDates.start)} - ${formatDate(weekDates.end)}` : 'Select a week'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Or select date:</span>
          <Input
            type="date"
            value={datePickerValue}
            onChange={handleDateRangeChange}
            className="w-36 text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default WeekPicker;