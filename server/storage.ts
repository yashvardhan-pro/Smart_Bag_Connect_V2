
import { db } from "./db";
import {
  timetables,
  alerts,
  type Timetable,
  type InsertTimetable,
  type Alert,
  type InsertAlert
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Timetables
  getTimetables(): Promise<Timetable[]>;
  updateTimetable(day: string, subjects: string[]): Promise<Timetable>;

  // Alerts
  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertRead(id: number): Promise<Alert | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getTimetables(): Promise<Timetable[]> {
    return await db.select().from(timetables);
  }

  async updateTimetable(day: string, subjects: string[]): Promise<Timetable> {
    const existing = await db.select().from(timetables).where(eq(timetables.day, day));

    if (existing.length > 0) {
      const [updated] = await db
        .update(timetables)
        .set({ subjects, updatedAt: new Date() })
        .where(eq(timetables.day, day))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(timetables)
        .values({ day, subjects })
        .returning();
      return created;
    }
  }

  async getAlerts(): Promise<Alert[]> {
    return await db.select().from(alerts).orderBy(desc(alerts.receivedAt));
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db.insert(alerts).values(insertAlert).returning();
    return alert;
  }

  async markAlertRead(id: number): Promise<Alert | undefined> {
    const [updated] = await db
      .update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
