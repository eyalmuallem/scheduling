'use client';

import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWeekStart, formatDateRange, getNextWeek, getPrevWeek } from '@/lib/types';

interface WeekSelectorProps {
  weekStart: string;
  onWeekChange: (weekStart: string) => void;
}

export function WeekSelector({ weekStart, onWeekChange }: WeekSelectorProps) {
  const currentWeekStart = getWeekStart();
  const nextWeekStart = getNextWeek(currentWeekStart);
  const isCurrentWeek = weekStart === currentWeekStart;
  const isNextWeek = weekStart === nextWeekStart;
  
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-card rounded-lg border mb-6">
      <Button 
        variant="outline" 
        size="icon"
        onClick={() => onWeekChange(getPrevWeek(weekStart))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      
      <div className="flex-1 text-center">
        <div className="text-lg font-semibold">
          {formatDateRange(weekStart)}
        </div>
        {isNextWeek && (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 border border-emerald-200 mt-1">
            שבוע הבא
          </span>
        )}
        {isCurrentWeek && !isNextWeek && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 border border-amber-200 mt-1">
            השבוע הנוכחי
          </span>
        )}
      </div>
      
      <Button 
        variant="outline" 
        size="icon"
        onClick={() => onWeekChange(getNextWeek(weekStart))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
  );
}
