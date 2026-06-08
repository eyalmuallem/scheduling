export type TaskType = 'נוכחות' | 'תמל' | 'חזרות' | 'חופש';

export interface Soldier {
  id: number;
  name: string;
  createdAt?: Date;
}

export interface Constraint {
  id: number;
  soldierId: number;
  weekStart: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime?: string | null;
  endTime?: string | null;
  allDay: boolean;
  reason?: string | null;
  createdAt?: Date;
}

export interface Assignment {
  id: number;
  soldierId: number;
  weekStart: string;
  dayOfWeek: number;
  task: TaskType;
  details?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Week {
  id?: number;
  weekStart: string;
  published: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export const TASKS: TaskType[] = ['נוכחות', 'תמל', 'חזרות', 'חופש'];

export const TASK_COLORS: Record<TaskType, string> = {
  'נוכחות': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'תמל': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'חזרות': 'bg-red-100 text-red-800 border-red-300',
  'חופש': 'bg-purple-100 text-purple-800 border-purple-300',
};

// Helper functions
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function getWeekDates(weekStart: string): Date[] {
  const start = new Date(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return date;
  });
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
}

export function formatDateRange(weekStart: string): string {
  const dates = getWeekDates(weekStart);
  const first = dates[0];
  const last = dates[6];
  return `${formatDateShort(first)} - ${formatDateShort(last)}`;
}

export function getNextWeek(weekStart: string): string {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + 7);
  return date.toISOString().split('T')[0];
}

export function getPrevWeek(weekStart: string): string {
  const date = new Date(weekStart);
  date.setDate(date.getDate() - 7);
  return date.toISOString().split('T')[0];
}
