'use server'

import { db } from '@/lib/db'
import { soldiers, constraints, assignments, weeks } from '@/lib/db/schema'
import { eq, and, gt, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

const ROLE_WAREHOUSE = '[מחסנאי]'
const CONSTRAINT_LOCK_REASON = '__CONSTRAINT_SUBMISSIONS_LOCKED__'
const CONSTRAINT_LOCK_DAY = -1
const CONSTRAINT_LOCK_SOLDIER_IDS = {
  soundman: -1001,
  warehouse: -1002,
} as const

export type ConstraintGroup = keyof typeof CONSTRAINT_LOCK_SOLDIER_IDS

function getConstraintGroupFromSoldierName(name: string): ConstraintGroup {
  return name.includes(ROLE_WAREHOUSE) ? 'warehouse' : 'soundman'
}

function getConstraintLockSoldierId(group: ConstraintGroup) {
  return CONSTRAINT_LOCK_SOLDIER_IDS[group]
}

async function isConstraintGroupLocked(weekStart: string, group: ConstraintGroup) {
  const result = await db
    .select({ id: constraints.id })
    .from(constraints)
    .where(
      and(
        eq(constraints.weekStart, weekStart),
        eq(constraints.soldierId, getConstraintLockSoldierId(group)),
        eq(constraints.dayOfWeek, CONSTRAINT_LOCK_DAY),
        eq(constraints.reason, CONSTRAINT_LOCK_REASON)
      )
    )
    .limit(1)

  return result.length > 0
}

async function isWeekPublished(weekStart: string) {
  const result = await db
    .select({ published: weeks.published })
    .from(weeks)
    .where(eq(weeks.weekStart, weekStart))
    .limit(1)

  return Boolean(result[0]?.published)
}

async function assertConstraintSubmissionOpen(soldierId: number, weekStart: string) {
  if (await isWeekPublished(weekStart)) {
    throw new Error('השבוע כבר פורסם ולכן הגשת האילוצים נעולה')
  }

  const soldier = await db
    .select({ name: soldiers.name })
    .from(soldiers)
    .where(eq(soldiers.id, soldierId))
    .limit(1)

  if (!soldier[0]) {
    throw new Error('החייל לא נמצא')
  }

  const group = getConstraintGroupFromSoldierName(soldier[0].name)
  if (await isConstraintGroupLocked(weekStart, group)) {
    throw new Error('הגשת האילוצים לקבוצה זו נעולה לשבוע הנבחר')
  }
}

// --- Soldiers ---

export async function getSoldiers() {
  return db.select().from(soldiers).orderBy(soldiers.name)
}

export async function addSoldier(name: string) {
  const result = await db.insert(soldiers).values({ name }).returning()
  revalidatePath('/')
  return result[0]
}

export async function removeSoldier(id: number) {
  await db.delete(soldiers).where(eq(soldiers.id, id))
  revalidatePath('/')
}

// --- Constraints ---

export async function getConstraints(weekStart: string) {
  return db
    .select()
    .from(constraints)
    .where(
      and(
        eq(constraints.weekStart, weekStart),
        gt(constraints.soldierId, 0)
      )
    )
    .orderBy(constraints.soldierId)
}

export async function getConstraintsBySoldier(soldierId: number, weekStart: string) {
  return db
    .select()
    .from(constraints)
    .where(
      and(
        eq(constraints.soldierId, soldierId),
        eq(constraints.weekStart, weekStart)
      )
    )
}

export async function getConstraintSubmissionLocks(weekStart: string) {
  const rows = await db
    .select({ soldierId: constraints.soldierId })
    .from(constraints)
    .where(
      and(
        eq(constraints.weekStart, weekStart),
        inArray(constraints.soldierId, Object.values(CONSTRAINT_LOCK_SOLDIER_IDS)),
        eq(constraints.dayOfWeek, CONSTRAINT_LOCK_DAY),
        eq(constraints.reason, CONSTRAINT_LOCK_REASON)
      )
    )

  const lockedIds = new Set(rows.map((row) => row.soldierId))
  return {
    soundman: lockedIds.has(CONSTRAINT_LOCK_SOLDIER_IDS.soundman),
    warehouse: lockedIds.has(CONSTRAINT_LOCK_SOLDIER_IDS.warehouse),
  }
}

export async function setConstraintSubmissionLocked(
  weekStart: string,
  group: ConstraintGroup,
  locked: boolean
) {
  const markerSoldierId = getConstraintLockSoldierId(group)
  const markerWhere = and(
    eq(constraints.weekStart, weekStart),
    eq(constraints.soldierId, markerSoldierId),
    eq(constraints.dayOfWeek, CONSTRAINT_LOCK_DAY),
    eq(constraints.reason, CONSTRAINT_LOCK_REASON)
  )

  // Delete first so repeated clicks can never create duplicate lock markers.
  await db.delete(constraints).where(markerWhere)

  if (locked) {
    await db.insert(constraints).values({
      soldierId: markerSoldierId,
      weekStart,
      dayOfWeek: CONSTRAINT_LOCK_DAY,
      allDay: true,
      reason: CONSTRAINT_LOCK_REASON,
    })
  }

  revalidatePath('/constraints')
  revalidatePath('/commander')
  return getConstraintSubmissionLocks(weekStart)
}

export async function addConstraint(data: {
  soldierId: number
  weekStart: string
  dayOfWeek: number
  allDay: boolean
  startTime?: string
  endTime?: string
  reason?: string
}) {
  await assertConstraintSubmissionOpen(data.soldierId, data.weekStart)

  const result = await db.insert(constraints).values(data).returning()
  revalidatePath('/')
  return result[0]
}

export async function removeConstraint(id: number) {
  const target = await db
    .select({ soldierId: constraints.soldierId, weekStart: constraints.weekStart })
    .from(constraints)
    .where(eq(constraints.id, id))
    .limit(1)

  if (!target[0] || target[0].soldierId <= 0) return

  await assertConstraintSubmissionOpen(target[0].soldierId, target[0].weekStart)
  await db.delete(constraints).where(eq(constraints.id, id))
  revalidatePath('/')
}

export async function clearSoldierConstraints(soldierId: number, weekStart: string) {
  await assertConstraintSubmissionOpen(soldierId, weekStart)

  await db
    .delete(constraints)
    .where(
      and(
        eq(constraints.soldierId, soldierId),
        eq(constraints.weekStart, weekStart)
      )
    )
  revalidatePath('/')
}

// --- Assignments ---

export async function getAssignments(weekStart: string) {
  return db
    .select()
    .from(assignments)
    .where(eq(assignments.weekStart, weekStart))
}

export async function setAssignment(data: {
  soldierId: number
  weekStart: string
  dayOfWeek: number
  task: string
  details?: string
}) {
  // Upsert - delete existing and insert new
  await db
    .delete(assignments)
    .where(
      and(
        eq(assignments.soldierId, data.soldierId),
        eq(assignments.weekStart, data.weekStart),
        eq(assignments.dayOfWeek, data.dayOfWeek)
      )
    )
  
  const result = await db.insert(assignments).values({
    ...data,
    updatedAt: new Date(),
  }).returning()
  
  revalidatePath('/')
  return result[0]
}

export async function removeAssignment(soldierId: number, weekStart: string, dayOfWeek: number) {
  await db
    .delete(assignments)
    .where(
      and(
        eq(assignments.soldierId, soldierId),
        eq(assignments.weekStart, weekStart),
        eq(assignments.dayOfWeek, dayOfWeek)
      )
    )
  revalidatePath('/')
}

// --- Weeks ---

export async function getWeekStatus(weekStart: string) {
  const result = await db
    .select()
    .from(weeks)
    .where(eq(weeks.weekStart, weekStart))
  
  return result[0] || { weekStart, published: false }
}

async function fillDefaultPresenceForWeek(weekStart: string) {
  const allSoldiers = await db.select().from(soldiers)
  const soundmen = allSoldiers.filter((soldier) => !soldier.name.includes('[מחסנאי]'))

  const existingAssignments = await db
    .select()
    .from(assignments)
    .where(eq(assignments.weekStart, weekStart))

  const existingRegularCells = new Set(
    existingAssignments
      .filter((assignment) => !assignment.details?.startsWith('מחסנאי'))
      .map((assignment) => `${assignment.soldierId}-${assignment.dayOfWeek}`)
  )

  const missingPresenceAssignments = soundmen.flatMap((soldier) =>
    Array.from({ length: 7 }, (_, dayOfWeek) => ({
      soldierId: soldier.id,
      weekStart,
      dayOfWeek,
      task: 'נוכחות',
      details: null,
      updatedAt: new Date(),
    })).filter((assignment) => !existingRegularCells.has(`${assignment.soldierId}-${assignment.dayOfWeek}`))
  )

  if (missingPresenceAssignments.length > 0) {
    await db.insert(assignments).values(missingPresenceAssignments)
  }

  return missingPresenceAssignments.length
}

export async function setWeekPublished(weekStart: string, published: boolean) {
  // When publishing, materialize default presence only for missing regular soundman cells.
  // This keeps the database light during planning and creates the final visible schedule only at publish time.
  if (published) {
    await fillDefaultPresenceForWeek(weekStart)
  }

  // Upsert - check if exists
  const existing = await db
    .select()
    .from(weeks)
    .where(eq(weeks.weekStart, weekStart))
  
  if (existing.length > 0) {
    await db
      .update(weeks)
      .set({ published, updatedAt: new Date() })
      .where(eq(weeks.weekStart, weekStart))
  } else {
    await db.insert(weeks).values({ weekStart, published })
  }
  
  revalidatePath('/')
}
