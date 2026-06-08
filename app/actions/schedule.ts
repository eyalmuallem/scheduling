'use server'

import { db } from '@/lib/db'
import { soldiers, constraints, assignments, weeks } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

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
    .where(eq(constraints.weekStart, weekStart))
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

export async function addConstraint(data: {
  soldierId: number
  weekStart: string
  dayOfWeek: number
  allDay: boolean
  startTime?: string
  endTime?: string
  reason?: string
}) {
  const result = await db.insert(constraints).values(data).returning()
  revalidatePath('/')
  return result[0]
}

export async function removeConstraint(id: number) {
  await db.delete(constraints).where(eq(constraints.id, id))
  revalidatePath('/')
}

export async function clearSoldierConstraints(soldierId: number, weekStart: string) {
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
