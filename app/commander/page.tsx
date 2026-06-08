'use client';

import { useEffect, useState } from 'react';
import { Lock, Eye, EyeOff, Send, Users, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Navigation } from '@/components/navigation';
import { WeekSelector } from '@/components/week-selector';
import { 
  getSoldiers, 
  addSoldier as addSoldierAction,
  removeSoldier as removeSoldierAction,
  getAssignments,
  setAssignment as setAssignmentAction,
  removeAssignment as removeAssignmentAction,
  getConstraints,
  getWeekStatus,
  setWeekPublished,
} from '@/app/actions/schedule';
import { DAYS_OF_WEEK, TASKS, TASK_COLORS, TaskType, getWeekStart, getWeekDates, formatDateShort } from '@/lib/types';
import { cn } from '@/lib/utils';
import useSWR from 'swr';

const COMMANDER_PASSWORD = '1234';

const ROLE_WAREHOUSE = '[מחסנאי]';
const ROLE_SOUNDMAN = '[סאונדמן]';
const WAREHOUSE_DETAIL_PREFIX = 'מחסנאי';

const isWarehouseWorker = (name: string) => name.includes(ROLE_WAREHOUSE);
const isSoundman = (name: string) => !isWarehouseWorker(name);
const PERSONAL_NUMBER_REGEX = /\[(\d{3,12})\]/g;

const getPersonalNumber = (name: string) => {
  const matches = Array.from(name.matchAll(PERSONAL_NUMBER_REGEX));
  return matches.at(-1)?.[1] || '';
};

const cleanName = (name: string) =>
  name
    .replace(ROLE_WAREHOUSE, '')
    .replace(ROLE_SOUNDMAN, '')
    .replace(PERSONAL_NUMBER_REGEX, '')
    .trim();
const isWarehouseAssignment = (assignment?: Assignment) =>
  assignment?.details?.startsWith(WAREHOUSE_DETAIL_PREFIX);
const warehouseDetailsForTimes = (startTime: string, endTime: string) => `${WAREHOUSE_DETAIL_PREFIX} | ${startTime}-${endTime}`;
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

interface Constraint {
  id: number;
  soldierId: number;
  weekStart: string;
  dayOfWeek: number;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

interface WeekStatus {
  weekStart: string;
  published: boolean;
}

export default function CommanderPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [newSoldierName, setNewSoldierName] = useState('');
  const [newSoldierType, setNewSoldierType] = useState<'soundman' | 'warehouse'>('soundman');
  const [newSoldierPersonalNumber, setNewSoldierPersonalNumber] = useState('');
  const [showConstraints, setShowConstraints] = useState(true);

  // Fetch soldiers
  const { data: soldiers = [], mutate: mutateSoldiers } = useSWR<Soldier[]>('soldiers', getSoldiers);

  // Fetch week status
  const { data: weekStatus, mutate: mutateWeekStatus } = useSWR<WeekStatus>(
    `week-status-${weekStart}`,
    () => getWeekStatus(weekStart)
  );

  // Fetch assignments
  const { data: assignments = [], mutate: mutateAssignments } = useSWR<Assignment[]>(
    `assignments-${weekStart}`,
    () => getAssignments(weekStart)
  );

  // Fetch constraints
  const { data: constraints = [], mutate: mutateConstraints } = useSWR<Constraint[]>(
    `constraints-${weekStart}`,
    () => getConstraints(weekStart)
  );

  const isPublished = weekStatus?.published ?? false;
  const soundmen = soldiers.filter((soldier) => isSoundman(soldier.name));
  const warehouseWorkers = soldiers.filter((soldier) => isWarehouseWorker(soldier.name));

  const handleLogin = () => {
    if (password === COMMANDER_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('סיסמה שגויה');
    }
  };

  const handlePublish = async () => {
    await setWeekPublished(weekStart, true);
    mutateWeekStatus();
    mutateAssignments();
  };

  const handleUnpublish = async () => {
    await setWeekPublished(weekStart, false);
    mutateWeekStatus();
  };

  const handleAddSoldier = async () => {
    const trimmedName = newSoldierName.trim();
    const trimmedPersonalNumber = newSoldierPersonalNumber.trim();

    if (trimmedName && trimmedPersonalNumber) {
      const roleSuffix = newSoldierType === 'warehouse' ? ROLE_WAREHOUSE : ROLE_SOUNDMAN;
      const cleanInputName = cleanName(trimmedName);
      const cleanPersonalNumber = trimmedPersonalNumber.replace(/[^0-9]/g, '');

      if (!cleanPersonalNumber) return;

      await addSoldierAction(`${cleanInputName} ${roleSuffix} [${cleanPersonalNumber}]`);
      mutateSoldiers();
      setNewSoldierName('');
      setNewSoldierType('soundman');
      setNewSoldierPersonalNumber('');
    }
  };

  const handleRemoveSoldier = async (id: number) => {
    await removeSoldierAction(id);
    mutateSoldiers();
  };

  const getAssignmentForCell = (soldierId: number, dayOfWeek: number): Assignment | undefined => {
    return assignments.find(a => a.soldierId === soldierId && a.dayOfWeek === dayOfWeek && !isWarehouseAssignment(a));
  };

  const getWarehouseAssignmentForCell = (soldierId: number, dayOfWeek: number): Assignment | undefined => {
    return assignments.find(a => a.soldierId === soldierId && a.dayOfWeek === dayOfWeek && isWarehouseAssignment(a));
  };

  const handleSetWarehouseAssignment = async (soldierId: number, dayOfWeek: number, startTime: string, endTime: string) => {
    if (!startTime || !endTime) return;

    await handleSetAssignment(
      soldierId,
      dayOfWeek,
      'נוכחות',
      warehouseDetailsForTimes(startTime, endTime)
    );
  };

  const handleRemoveWarehouseAssignment = async (soldierId: number, dayOfWeek: number) => {
    await handleRemoveAssignment(soldierId, dayOfWeek);
  };

  const getConstraintsForCell = (soldierId: number, dayOfWeek: number): Constraint[] => {
    return constraints.filter(c => c.soldierId === soldierId && c.dayOfWeek === dayOfWeek);
  };

  const handleSetAssignment = async (soldierId: number, dayOfWeek: number, task: TaskType, details?: string) => {
    await setAssignmentAction({
      soldierId,
      weekStart,
      dayOfWeek,
      task,
      details,
    });
    mutateAssignments();
  };

  const handleRemoveAssignment = async (soldierId: number, dayOfWeek: number) => {
    await removeAssignmentAction(soldierId, weekStart, dayOfWeek);
    mutateAssignments();
  };

  const weekDates = getWeekDates(weekStart);

  // Get soldier name by id for constraints display
  const getSoldierName = (soldierId: number): string => {
    return soldiers.find(s => s.id === soldierId)?.name || 'לא ידוע';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8 max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>כניסת מפקד</CardTitle>
              <CardDescription>הזן את הסיסמה כדי לגשת לממשק הניהול</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">סיסמה</Label>
                <Input 
                  id="password"
                  type="password"
                  placeholder="הזן סיסמה..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
              </div>
              <Button onClick={handleLogin} className="w-full">
                התחבר
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">ממשק מפקד</h1>
              <p className="text-muted-foreground mt-2">ניהול שיבוצים ופרסום סידור</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConstraints(!showConstraints)}
              >
                {showConstraints ? <EyeOff className="h-4 w-4 ml-2" /> : <Eye className="h-4 w-4 ml-2" />}
                {showConstraints ? 'הסתר אילוצים' : 'הצג אילוצים'}
              </Button>
              
              {isPublished ? (
                <Button variant="outline" onClick={handleUnpublish}>
                  <EyeOff className="h-4 w-4 ml-2" />
                  בטל פרסום
                </Button>
              ) : (
                <Button onClick={handlePublish} className="bg-emerald-600 hover:bg-emerald-700">
                  <Send className="h-4 w-4 ml-2" />
                  פרסם שבוע
                </Button>
              )}
            </div>
          </div>

          <WeekSelector weekStart={weekStart} onWeekChange={setWeekStart} />

          {isPublished && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-100 border-emerald-300">
                פורסם
              </Badge>
              <span>הסידור לשבוע זה פורסם ונראה לכל החיילים</span>
            </div>
          )}

          {/* Soldiers Management */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    ניהול חיילים
                  </CardTitle>
                  <CardDescription>{soldiers.length} חיילים ברשימה</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 ml-2" />
                      הוסף חייל
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>הוסף חייל חדש</DialogTitle>
                      <DialogDescription>הזן שם, סוג חייל ומספר אישי. הכל נשמר מאחורי הקלעים בשם, בלי שינוי בדאטהבייס.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>שם החייל</Label>
                        <Input 
                          placeholder="לדוגמה: ישראל ישראלי"
                          value={newSoldierName}
                          onChange={(e) => setNewSoldierName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSoldier()}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>מספר אישי</Label>
                        <Input
                          inputMode="numeric"
                          placeholder="לדוגמה: 1234567"
                          value={newSoldierPersonalNumber}
                          onChange={(e) => setNewSoldierPersonalNumber(e.target.value.replace(/[^0-9]/g, ''))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSoldier()}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>סוג חייל</Label>
                        <Select
                          value={newSoldierType}
                          onValueChange={(value) => setNewSoldierType(value as 'soundman' | 'warehouse')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר סוג חייל" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="soundman">סאונדמן</SelectItem>
                            <SelectItem value="warehouse">מחסנאי</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">ביטול</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button onClick={handleAddSoldier} disabled={!newSoldierName.trim() || !newSoldierPersonalNumber.trim()}>הוסף</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {soldiers.map((soldier) => (
                  <Badge 
                    key={soldier.id} 
                    variant="secondary"
                    className="pl-1 flex items-center gap-1"
                  >
                    <span>{cleanName(soldier.name)}</span>
                    <span className="text-xs opacity-70">{isWarehouseWorker(soldier.name) ? 'מחסנאי' : 'סאונדמן'}</span>
                    {getPersonalNumber(soldier.name) && (
                      <span className="text-xs opacity-60">מספר אישי: {getPersonalNumber(soldier.name)}</span>
                    )}
                    <button 
                      onClick={() => handleRemoveSoldier(soldier.id)}
                      className="hover:bg-destructive/20 rounded p-0.5"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Constraints Summary */}
          {showConstraints && constraints.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  אילוצים שהוגשו
                </CardTitle>
                <CardDescription>{constraints.length} אילוצים לשבוע זה</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {constraints.map((constraint) => (
                    <div 
                      key={constraint.id}
                      className="bg-amber-50 border border-amber-200 rounded-lg p-3"
                    >
                      <div className="font-medium text-amber-900">{getSoldierName(constraint.soldierId)}</div>
                      <div className="text-sm text-amber-700">
                        יום {DAYS_OF_WEEK[constraint.dayOfWeek]}
                        {constraint.allDay 
                          ? ' (כל היום)' 
                          : ` (${constraint.startTime} - ${constraint.endTime})`}
                      </div>
                      {constraint.reason && (
                        <div className="text-xs text-amber-600 mt-1">
                          {constraint.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assignment Table */}
          <Card>
            <CardHeader>
              <CardTitle>טבלת שיבוצים</CardTitle>
              <CardDescription>לחץ על תא כדי לשבץ או לערוך</CardDescription>
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
                    {soundmen.map((soldier) => (
                      <tr key={soldier.id}>
                        <td className="border p-3 font-medium sticky right-0 bg-card z-10">
                          {cleanName(soldier.name)}
                        </td>
                        {DAYS_OF_WEEK.map((day, dayIndex) => {
                          const assignment = getAssignmentForCell(soldier.id, dayIndex);
                          const cellConstraints = getConstraintsForCell(soldier.id, dayIndex);
                          const hasConstraintForCell = cellConstraints.length > 0;
                          
                          return (
                            <td 
                              key={dayIndex} 
                              className={cn(
                                "border p-1 text-center relative",
                                showConstraints && hasConstraintForCell && "bg-amber-50"
                              )}
                            >
                              <AssignmentCell
                                soldier={soldier}
                                dayOfWeek={dayIndex}
                                assignment={assignment}
                                constraints={cellConstraints}
                                showConstraints={showConstraints}
                                onAssign={(task, details) => handleSetAssignment(soldier.id, dayIndex, task, details)}
                                onRemove={() => handleRemoveAssignment(soldier.id, dayIndex)}
                              />
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
                {showConstraints && (
                  <div className="px-3 py-1 rounded text-sm border bg-amber-50 border-amber-200 text-amber-800">
                    יש אילוץ
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Warehouse Shifts */}
          <Card>
            <CardHeader>
              <CardTitle>משמרות מחסנאים</CardTitle>
              <CardDescription>
                לכל מחסנאי ולכל יום אפשר לקבוע שעת התחלה וסיום נפרדות. השעות נשמרות בדאטהבייס בתוך שדה הפירוט הקיים, בלי שינוי מבנה נתונים.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {warehouseWorkers.length === 0 ? (
                <div className="text-sm text-muted-foreground border rounded-lg p-4">
                  לא נמצאו מחסנאים. הוסף חייל חדש ובחר בסוג חייל: מחסנאי.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border bg-muted p-3 text-right font-semibold sticky right-0 bg-muted z-10 min-w-[140px]">
                          מחסנאי
                        </th>
                        {DAYS_OF_WEEK.map((day, index) => (
                          <th key={index} className="border bg-muted p-3 text-center font-semibold min-w-[190px]">
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
                            const cellConstraints = getConstraintsForCell(worker.id, dayIndex);
                            const hasConstraintForCell = cellConstraints.length > 0;

                            return (
                              <td
                                key={dayIndex}
                                className={cn(
                                  "border p-2 align-top",
                                  showConstraints && hasConstraintForCell && "bg-amber-50"
                                )}
                              >
                                <WarehouseWorkerCell
                                  worker={worker}
                                  dayOfWeek={dayIndex}
                                  assignment={assignment}
                                  constraints={cellConstraints}
                                  showConstraints={showConstraints}
                                  onSave={(startTime, endTime) =>
                                    handleSetWarehouseAssignment(worker.id, dayIndex, startTime, endTime)
                                  }
                                  onRemove={() => handleRemoveWarehouseAssignment(worker.id, dayIndex)}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="text-xs text-muted-foreground mt-4 border-t pt-3">
                שים לב: בלי שינוי דאטהבייס, מחסנאי אחד יכול לקבל משמרת אחת בלבד בכל יום. אם צריך שתי משמרות לאותו מחסנאי באותו יום, זה כבר דורש שינוי מבנה נתונים.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


interface WarehouseWorkerCellProps {
  worker: Soldier;
  dayOfWeek: number;
  assignment?: Assignment;
  constraints: Constraint[];
  showConstraints: boolean;
  onSave: (startTime: string, endTime: string) => void;
  onRemove: () => void;
}

function WarehouseWorkerCell({
  worker,
  dayOfWeek,
  assignment,
  constraints,
  showConstraints,
  onSave,
  onRemove,
}: WarehouseWorkerCellProps) {
  const parsedTimes = parseWarehouseTimes(assignment?.details);
  const [startTime, setStartTime] = useState(parsedTimes.startTime);
  const [endTime, setEndTime] = useState(parsedTimes.endTime);

  useEffect(() => {
    const latestTimes = parseWarehouseTimes(assignment?.details);
    setStartTime(latestTimes.startTime);
    setEndTime(latestTimes.endTime);
  }, [assignment?.details]);

  const handleSave = () => {
    onSave(startTime, endTime);
  };

  const handleRemove = () => {
    onRemove();
    setStartTime('');
    setEndTime('');
  };

  return (
    <div className="space-y-2 text-right">
      {showConstraints && constraints.length > 0 && (
        <div className="bg-amber-100 border border-amber-300 rounded p-2 text-xs text-amber-900">
          <div className="font-medium flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            אילוץ
          </div>
          {constraints.map((constraint) => (
            <div key={constraint.id} className="mt-1">
              {constraint.allDay ? 'כל היום' : `${constraint.startTime} - ${constraint.endTime}`}
              {constraint.reason && ` - ${constraint.reason}`}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">משעה</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className="text-center"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">עד שעה</Label>
          <Input
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            className="text-center"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={handleSave}
          disabled={!startTime || !endTime}
        >
          שמור
        </Button>
        {assignment && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="px-2 text-destructive hover:text-destructive"
            title="נקה משמרת"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {assignment && (
        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 text-center">
          נשמר: {parsedTimes.startTime} - {parsedTimes.endTime}
        </div>
      )}
    </div>
  );
}

interface AssignmentCellProps {
  soldier: Soldier;
  dayOfWeek: number;
  assignment?: Assignment;
  constraints: Constraint[];
  showConstraints: boolean;
  onAssign: (task: TaskType, details?: string) => void;
  onRemove: () => void;
}

function AssignmentCell({ 
  soldier, 
  dayOfWeek, 
  assignment, 
  constraints, 
  showConstraints,
  onAssign, 
  onRemove 
}: AssignmentCellProps) {
  const [selectedTask, setSelectedTask] = useState<TaskType | ''>('');
  const [details, setDetails] = useState(assignment?.details || '');
  const [isOpen, setIsOpen] = useState(false);

  const hasDetailsChanged = details !== (assignment?.details || '');
  const taskToSave = selectedTask || (assignment?.task as TaskType | undefined);
  const canSave = Boolean(selectedTask || (assignment && hasDetailsChanged));

  const handleSave = () => {
    if (!taskToSave) return;

    onAssign(taskToSave, details || undefined);
    setSelectedTask('');
    setIsOpen(false);
  };

  const handleRemove = () => {
    onRemove();
    setIsOpen(false);
    setSelectedTask('');
    setDetails('');
  };

  // Reset draft state when popover opens.
  // The current assignment is displayed above, but the selector stays on "בחר משימה"
  // so changing a default presence cell requires an explicit choice + save.
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setSelectedTask('');
      setDetails(assignment?.details || '');
    }
  };

  const getSaveButtonText = () => {
    if (selectedTask) {
      return assignment ? `שנה ל${selectedTask}` : `בחר ${selectedTask}`;
    }

    return assignment ? 'שמור פירוט' : 'בחר משימה';
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="w-full min-h-[60px] p-1 hover:bg-accent/50 rounded transition-colors">
          {showConstraints && constraints.length > 0 && (
            <div className="absolute top-1 left-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            </div>
          )}
          {assignment ? (
            <div 
              className={cn(
                'px-2 py-1 rounded text-sm font-medium border',
                TASK_COLORS[assignment.task as TaskType]
              )}
            >
              <div>{assignment.task}</div>
              {assignment.details && (
                <div className="text-xs opacity-75 mt-1 truncate">
                  {assignment.details}
                </div>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">לחץ לשיבוץ</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="center">
        <div className="space-y-4">
          <div className="font-medium text-center border-b pb-2">
            {cleanName(soldier.name)} - יום {DAYS_OF_WEEK[dayOfWeek]}
          </div>
          
          {showConstraints && constraints.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-sm">
              <div className="font-medium text-amber-800 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                אילוץ:
              </div>
              {constraints.map((c) => (
                <div key={c.id} className="text-amber-700 text-xs mt-1">
                  {c.allDay ? 'כל היום' : `${c.startTime} - ${c.endTime}`}
                  {c.reason && ` - ${c.reason}`}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>משימה</Label>
            <Select
              value={selectedTask}
              onValueChange={(val) => setSelectedTask(val as TaskType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר משימה..." />
              </SelectTrigger>
              <SelectContent>
                {TASKS.map((task) => (
                  <SelectItem key={task} value={task}>
                    {task}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>פירוט (אופציונלי)</Label>
            <Textarea 
              placeholder="הוסף פרטים..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" className="flex-1" disabled={!canSave}>
              {getSaveButtonText()}
            </Button>
            {assignment && (
              <Button onClick={handleRemove} variant="destructive" size="sm" className="flex-1">
                <Trash2 className="h-4 w-4 ml-1" />
                הסר שיבוץ
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
