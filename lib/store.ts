'use client';

import { Soldier, Constraint, Assignment, Week } from './types';

const STORAGE_KEYS = {
  SOLDIERS: 'shifts_soldiers',
  CONSTRAINTS: 'shifts_constraints',
  ASSIGNMENTS: 'shifts_assignments',
  WEEKS: 'shifts_weeks',
  COMMANDER_PASSWORD: 'shifts_commander_pass',
};

// Default soldiers list
const DEFAULT_SOLDIERS: Soldier[] = [
  { id: '1', name: 'יוסי כהן' },
  { id: '2', name: 'דני לוי' },
  { id: '3', name: 'אבי ישראלי' },
  { id: '4', name: 'משה דוד' },
  { id: '5', name: 'רון אברהם' },
  { id: '6', name: 'גיל יעקב' },
  { id: '7', name: 'עומר שמעון' },
  { id: '8', name: 'איתי רחמים' },
  { id: '9', name: 'נדב חיים' },
  { id: '10', name: 'אור מלכה' },
];

function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Soldiers
export function getSoldiers(): Soldier[] {
  return getFromStorage(STORAGE_KEYS.SOLDIERS, DEFAULT_SOLDIERS);
}

export function setSoldiers(soldiers: Soldier[]): void {
  setToStorage(STORAGE_KEYS.SOLDIERS, soldiers);
}

export function addSoldier(name: string): Soldier {
  const soldiers = getSoldiers();
  const newSoldier: Soldier = {
    id: Date.now().toString(),
    name,
  };
  setSoldiers([...soldiers, newSoldier]);
  return newSoldier;
}

export function removeSoldier(id: string): void {
  const soldiers = getSoldiers();
  setSoldiers(soldiers.filter(s => s.id !== id));
}

// Constraints
export function getConstraints(weekId?: string): Constraint[] {
  const all = getFromStorage<Constraint[]>(STORAGE_KEYS.CONSTRAINTS, []);
  return weekId ? all.filter(c => c.weekId === weekId) : all;
}

export function addConstraint(constraint: Omit<Constraint, 'id'>): Constraint {
  const constraints = getConstraints();
  const newConstraint: Constraint = {
    ...constraint,
    id: Date.now().toString(),
  };
  setToStorage(STORAGE_KEYS.CONSTRAINTS, [...constraints, newConstraint]);
  return newConstraint;
}

export function removeConstraint(id: string): void {
  const constraints = getConstraints();
  setToStorage(STORAGE_KEYS.CONSTRAINTS, constraints.filter(c => c.id !== id));
}

export function getConstraintsBySoldier(soldierId: string, weekId: string): Constraint[] {
  return getConstraints(weekId).filter(c => c.soldierId === soldierId);
}

// Assignments
export function getAssignments(weekId?: string): Assignment[] {
  const all = getFromStorage<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, []);
  return weekId ? all.filter(a => a.weekId === weekId) : all;
}

export function setAssignment(assignment: Omit<Assignment, 'id'>): Assignment {
  const assignments = getAssignments();
  // Remove existing assignment for same soldier/day/week
  const filtered = assignments.filter(
    a => !(a.soldierId === assignment.soldierId && 
           a.dayOfWeek === assignment.dayOfWeek && 
           a.weekId === assignment.weekId)
  );
  const newAssignment: Assignment = {
    ...assignment,
    id: Date.now().toString(),
  };
  setToStorage(STORAGE_KEYS.ASSIGNMENTS, [...filtered, newAssignment]);
  return newAssignment;
}

export function removeAssignment(soldierId: string, dayOfWeek: number, weekId: string): void {
  const assignments = getAssignments();
  setToStorage(
    STORAGE_KEYS.ASSIGNMENTS, 
    assignments.filter(a => 
      !(a.soldierId === soldierId && a.dayOfWeek === dayOfWeek && a.weekId === weekId)
    )
  );
}

export function getAssignmentForCell(soldierId: string, dayOfWeek: number, weekId: string): Assignment | undefined {
  return getAssignments(weekId).find(
    a => a.soldierId === soldierId && a.dayOfWeek === dayOfWeek
  );
}

// Weeks
export function getWeeks(): Week[] {
  return getFromStorage<Week[]>(STORAGE_KEYS.WEEKS, []);
}

export function getCurrentWeek(): Week {
  const weeks = getWeeks();
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);
  const weekId = sunday.toISOString().split('T')[0];
  
  let week = weeks.find(w => w.id === weekId);
  if (!week) {
    week = {
      id: weekId,
      startDate: weekId,
      isPublished: false,
    };
    setToStorage(STORAGE_KEYS.WEEKS, [...weeks, week]);
  }
  return week;
}

export function getWeekById(weekId: string): Week | undefined {
  return getWeeks().find(w => w.id === weekId);
}

export function publishWeek(weekId: string): void {
  const weeks = getWeeks();
  const updated = weeks.map(w => 
    w.id === weekId ? { ...w, isPublished: true } : w
  );
  // If week doesn't exist, create it
  if (!weeks.find(w => w.id === weekId)) {
    updated.push({ id: weekId, startDate: weekId, isPublished: true });
  }
  setToStorage(STORAGE_KEYS.WEEKS, updated);
}

export function unpublishWeek(weekId: string): void {
  const weeks = getWeeks();
  const updated = weeks.map(w => 
    w.id === weekId ? { ...w, isPublished: false } : w
  );
  setToStorage(STORAGE_KEYS.WEEKS, updated);
}

// Commander password
const DEFAULT_PASSWORD = 'mefaked123';

export function verifyCommanderPassword(password: string): boolean {
  const savedPassword = getFromStorage(STORAGE_KEYS.COMMANDER_PASSWORD, DEFAULT_PASSWORD);
  return password === savedPassword;
}

export function setCommanderPassword(newPassword: string): void {
  setToStorage(STORAGE_KEYS.COMMANDER_PASSWORD, newPassword);
}

// Week navigation helpers
export function getWeekDates(weekId: string): Date[] {
  const startDate = new Date(weekId);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    return date;
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
}

export function getNextWeekId(currentWeekId: string): string {
  const date = new Date(currentWeekId);
  date.setDate(date.getDate() + 7);
  return date.toISOString().split('T')[0];
}

export function getPrevWeekId(currentWeekId: string): string {
  const date = new Date(currentWeekId);
  date.setDate(date.getDate() - 7);
  return date.toISOString().split('T')[0];
}
