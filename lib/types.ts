export type TaskType = 'נוכחות' | 'תמל' | 'חזרות' | 'חופש' | 'שונות';

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

export const TASKS: TaskType[] = ['נוכחות', 'תמל', 'חזרות', 'חופש', 'שונות'];

export const TASK_COLORS: Record<TaskType, string> = {
  'נוכחות': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'תמל': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'חזרות': 'bg-red-100 text-red-800 border-red-300',
  'חופש': 'bg-purple-100 text-purple-800 border-purple-300',
  'שונות': 'bg-gray-100 text-gray-800 border-gray-300',
};

// Helper functions
// Format dates using the local calendar date instead of UTC. This prevents
// Israel-time dates around midnight from shifting to the previous day.
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(12, 0, 0, 0);
  return formatLocalDate(d);
}

export function getWeekDates(weekStart: string): Date[] {
  const start = parseLocalDate(weekStart);
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
  const date = parseLocalDate(weekStart);
  date.setDate(date.getDate() + 7);
  return formatLocalDate(date);
}

export function getPrevWeek(weekStart: string): string {
  const date = parseLocalDate(weekStart);
  date.setDate(date.getDate() - 7);
  return formatLocalDate(date);
}
