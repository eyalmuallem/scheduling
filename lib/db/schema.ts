import { pgTable, text, timestamp, boolean, serial, integer, date } from 'drizzle-orm/pg-core'

// --- App tables ------------------------------------------------------------

export const soldiers = pgTable('soldiers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const constraints = pgTable('constraints', {
  id: serial('id').primaryKey(),
  soldierId: integer('soldierId').notNull(),
  weekStart: date('weekStart').notNull(),
  dayOfWeek: integer('dayOfWeek').notNull(),
  startTime: text('startTime'),
  endTime: text('endTime'),
  allDay: boolean('allDay').notNull().default(true),
  reason: text('reason'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const assignments = pgTable('assignments', {
  id: serial('id').primaryKey(),
  soldierId: integer('soldierId').notNull(),
  weekStart: date('weekStart').notNull(),
  dayOfWeek: integer('dayOfWeek').notNull(),
  task: text('task').notNull(),
  details: text('details'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const weeks = pgTable('weeks', {
  id: serial('id').primaryKey(),
  weekStart: date('weekStart').notNull().unique(),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})
