
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Store timetable for each day
export const timetables = pgTable("timetables", {
  id: serial("id").primaryKey(),
  day: text("day").notNull().unique(), // Monday, Tuesday, etc.
  subjects: jsonb("subjects").notNull().$type<string[]>(), // Array of subjects
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Log alerts received from the bag
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  receivedAt: timestamp("received_at").defaultNow(),
  isRead: boolean("is_read").default(false),
});

// === SCHEMAS ===
export const insertTimetableSchema = createInsertSchema(timetables).omit({ id: true, updatedAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, receivedAt: true, isRead: true });

// === EXPLICIT TYPES ===
export type Timetable = typeof timetables.$inferSelect;
export type InsertTimetable = z.infer<typeof insertTimetableSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

// Request types
export type UpdateTimetableRequest = {
  day: string;
  subjects: string[];
};

export type CreateAlertRequest = {
  message: string;
};
