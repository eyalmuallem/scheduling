'use client';

import { useState } from 'react';
import { Download, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/navigation';
import { WeekSelector } from '@/components/week-selector';
import { 
  getSoldiers, 
  getAssignments,
  getWeekStatus,
} from '@/app/actions/schedule';
import { DAYS_OF_WEEK, TASK_COLORS, getWeekStart, getWeekDates, formatDateShort, TaskType } from '@/lib/types';
import { cn } from '@/lib/utils';
import useSWR from 'swr';

const ROLE_WAREHOUSE = '[מחסנאי]';
const ROLE_SOUNDMAN = '[סאונדמן]';
const WAREHOUSE_DETAIL_PREFIX = 'מחסנאי';

const isWarehouseWorker = (name: string) => name.includes(ROLE_WAREHOUSE);
const isSoundman = (name: string) => !isWarehouseWorker(name);
const cleanName = (name: string) =>
  name
    .replace(ROLE_WAREHOUSE, '')
    .replace(ROLE_SOUNDMAN, '')
    .replace(/\[\d+\]/g, '')
    .trim();
const isWarehouseAssignment = (assignment?: Assignment) =>
  assignment?.details?.startsWith(WAREHOUSE_DETAIL_PREFIX);
const parseWarehouseTimes = (details?: string | null) => {
  if (!details?.startsWith(WAREHOUSE_DETAIL_PREFIX)) return { startTime: '', endTime: '' };
  const match = details.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
  return { startTime: match?.[1] || '', endTime: match?.[2] || '' };
};

interface Soldier {
  id: number;
  name: string;
}

interface Assignment {
  id: number;
  soldierId: number;
  weekStart: string;
  dayOfWeek: number;
  task: string;
  details: string | null;
}

interface WeekStatus {
  weekStart: string;
  published: boolean;
}

type PrintTarget = 'soundmen' | 'warehouse';

const getPrintableDate = () =>
  new Date().toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });

const PrintableHeader = ({ title, weekDates }: { title: string; weekDates: Date[] }) => (
  <div className="print-header">
    <div>
      <h1>{title}</h1>
      <p>
        שבוע {formatDateShort(weekDates[0])} - {formatDateShort(weekDates[6])}
      </p>
    </div>
    <div className="print-meta">הופק בתאריך {getPrintableDate()}</div>
  </div>
);

export default function ViewPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [printTarget, setPrintTarget] = useState<PrintTarget | null>(null);

  const exportPdf = (target: PrintTarget) => {
    setPrintTarget(target);
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => setPrintTarget(null), 300);
    }, 50);
  };

  // Fetch soldiers
  const { data: soldiers = [] } = useSWR<Soldier[]>('soldiers', getSoldiers);

  // Fetch week status
  const { data: weekStatus } = useSWR<WeekStatus>(
    `week-status-${weekStart}`,
    () => getWeekStatus(weekStart)
  );

  // Fetch assignments
  const { data: assignments = [] } = useSWR<Assignment[]>(
    `assignments-${weekStart}`,
    () => getAssignments(weekStart)
  );

  const isPublished = weekStatus?.published ?? false;
  const soundmen = soldiers.filter((soldier) => isSoundman(soldier.name));
  const warehouseWorkers = soldiers.filter((soldier) => isWarehouseWorker(soldier.name));

  const getAssignment = (soldierId: number, dayOfWeek: number): Assignment | undefined => {
    return assignments.find(a => a.soldierId === soldierId && a.dayOfWeek === dayOfWeek && !isWarehouseAssignment(a));
  };

  const getWarehouseAssignmentForCell = (soldierId: number, dayOfWeek: number): Assignment | undefined => {
    return assignments.find(a => a.soldierId === soldierId && a.dayOfWeek === dayOfWeek && isWarehouseAssignment(a));
  };

  const weekDates = getWeekDates(weekStart);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">סידור שבועי</h1>
            <p className="text-muted-foreground mt-2">צפה בשיבוצים לשבוע הנבחר</p>
          </div>

          <WeekSelector weekStart={weekStart} onWeekChange={setWeekStart} />

          {!isPublished ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Lock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h2 className="text-xl font-semibold mb-2">הסידור טרם פורסם</h2>
                  <p>המפקד עדיין לא פרסם את הסידור לשבוע זה</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
            <Card>
              <CardHeader className="gap-4 md:flex md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>טבלת שיבוצים</CardTitle>
                  <CardDescription>
                    סידור עבודה לשבוע {formatDateShort(weekDates[0])} - {formatDateShort(weekDates[6])}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full md:w-auto"
                  onClick={() => exportPdf('soundmen')}
                >
                  <Download className="ml-2 h-4 w-4" />
                  ייצא PDF יומן סאונדמנים
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border bg-muted p-3 text-right font-semibold sticky right-0 bg-muted z-10 min-w-[120px]">
                          חייל
                        </th>
                        {DAYS_OF_WEEK.map((day, index) => (
                          <th key={index} className="border bg-muted p-3 text-center font-semibold min-w-[100px]">
                            <div>{day}</div>
                            <div className="text-xs font-normal text-muted-foreground">
                              {formatDateShort(weekDates[index])}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {soundmen.map((soldier) => (
                        <tr key={soldier.id}>
                          <td className="border p-3 font-medium sticky right-0 bg-card z-10">
                            {cleanName(soldier.name)}
                          </td>
                          {DAYS_OF_WEEK.map((_, dayIndex) => {
                            const assignment = getAssignment(soldier.id, dayIndex);
                            return (
                              <td key={dayIndex} className="border p-2 text-center">
                                {assignment ? (
                                  <div 
                                    className={cn(
                                      'px-2 py-1 rounded text-sm font-medium border',
                                      TASK_COLORS[assignment.task as TaskType]
                                    )}
                                  >
                                    <div>{assignment.task}</div>
                                    {assignment.details && (
                                      <div className="text-xs opacity-75 mt-1">
                                        {assignment.details}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
                  <div className="text-sm font-medium">מקרא:</div>
                  {Object.entries(TASK_COLORS).map(([task, colors]) => (
                    <div 
                      key={task}
                      className={cn('px-3 py-1 rounded text-sm border', colors)}
                    >
                      {task}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-4 md:flex md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>משמרות מחסנאים</CardTitle>
                  <CardDescription>
                    סידור מחסנאים לשבוע {formatDateShort(weekDates[0])} - {formatDateShort(weekDates[6])}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full md:w-auto"
                  onClick={() => exportPdf('warehouse')}
                  disabled={warehouseWorkers.length === 0}
                >
                  <Download className="ml-2 h-4 w-4" />
                  ייצא PDF יומן מחסנאים
                </Button>
              </CardHeader>
              <CardContent>
                {warehouseWorkers.length === 0 ? (
                  <div className="text-sm text-muted-foreground border rounded-lg p-4">
                    לא נמצאו מחסנאים לפרסום.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="border bg-muted p-3 text-right font-semibold sticky right-0 bg-muted z-10 min-w-[130px]">
                            מחסנאי
                          </th>
                          {DAYS_OF_WEEK.map((day, index) => (
                            <th key={index} className="border bg-muted p-3 text-center font-semibold min-w-[120px]">
                              <div>{day}</div>
                              <div className="text-xs font-normal text-muted-foreground">
                                {formatDateShort(weekDates[index])}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {warehouseWorkers.map((worker) => (
                          <tr key={worker.id}>
                            <td className="border p-3 font-medium sticky right-0 bg-card z-10">
                              {cleanName(worker.name)}
                            </td>
                            {DAYS_OF_WEEK.map((_, dayIndex) => {
                              const assignment = getWarehouseAssignmentForCell(worker.id, dayIndex);
                              const times = parseWarehouseTimes(assignment?.details);

                              return (
                                <td key={dayIndex} className="border p-2 text-center">
                                  {assignment && times.startTime && times.endTime ? (
                                    <div className="px-2 py-1 rounded text-sm font-medium border bg-emerald-100 text-emerald-800 border-emerald-300">
                                      {times.startTime} - {times.endTime}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="print-only" data-active-print={printTarget === 'soundmen' ? 'true' : 'false'} dir="rtl">
              <PrintableHeader title="יומן שבועי - סאונדמנים" weekDates={weekDates} />
              <table className="print-table">
                <thead>
                  <tr>
                    <th className="print-name-cell">סאונדמן</th>
                    {DAYS_OF_WEEK.map((day, index) => (
                      <th key={index}>
                        <div>{day}</div>
                        <span>{formatDateShort(weekDates[index])}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {soundmen.map((soldier) => (
                    <tr key={`print-soundman-${soldier.id}`}>
                      <td className="print-name-cell">{cleanName(soldier.name)}</td>
                      {DAYS_OF_WEEK.map((_, dayIndex) => {
                        const assignment = getAssignment(soldier.id, dayIndex);
                        return (
                          <td key={dayIndex}>
                            {assignment ? (
                              <div className="print-assignment">
                                <strong>{assignment.task}</strong>
                                {assignment.details && <span>{assignment.details}</span>}
                              </div>
                            ) : (
                              <span className="print-empty">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="print-footer">היומן מוצג רק לאחר פרסום שבוע במערכת.</div>
            </div>

            <div className="print-only" data-active-print={printTarget === 'warehouse' ? 'true' : 'false'} dir="rtl">
              <PrintableHeader title="יומן שבועי - מחסנאים" weekDates={weekDates} />
              <table className="print-table">
                <thead>
                  <tr>
                    <th className="print-name-cell">מחסנאי</th>
                    {DAYS_OF_WEEK.map((day, index) => (
                      <th key={index}>
                        <div>{day}</div>
                        <span>{formatDateShort(weekDates[index])}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {warehouseWorkers.map((worker) => (
                    <tr key={`print-warehouse-${worker.id}`}>
                      <td className="print-name-cell">{cleanName(worker.name)}</td>
                      {DAYS_OF_WEEK.map((_, dayIndex) => {
                        const assignment = getWarehouseAssignmentForCell(worker.id, dayIndex);
                        const times = parseWarehouseTimes(assignment?.details);
                        return (
                          <td key={dayIndex}>
                            {assignment && times.startTime && times.endTime ? (
                              <div className="print-assignment">
                                <strong>{times.startTime} - {times.endTime}</strong>
                              </div>
                            ) : (
                              <span className="print-empty">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="print-footer">היומן מוצג רק לאחר פרסום שבוע במערכת.</div>
            </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
