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
  const isCurrentWeek = weekStart === currentWeekStart;
  
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
        {isCurrentWeek && (
          <span className="text-sm text-muted-foreground">השבוע הנוכחי</span>
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
