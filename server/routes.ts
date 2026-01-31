
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === Timetables ===
  app.get(api.timetables.list.path, async (_req, res) => {
    const data = await storage.getTimetables();
    res.json(data);
  });

  app.post(api.timetables.update.path, async (req, res) => {
    try {
      const input = api.timetables.update.input.parse(req.body);
      const updated = await storage.updateTimetable(input.day, input.subjects);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // === Alerts ===
  app.get(api.alerts.list.path, async (_req, res) => {
    const data = await storage.getAlerts();
    res.json(data);
  });

  app.post(api.alerts.create.path, async (req, res) => {
    try {
      const input = api.alerts.create.input.parse(req.body);
      const created = await storage.createAlert(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.alerts.markRead.path, async (req, res) => {
    const id = Number(req.params.id);
    const updated = await storage.markAlertRead(id);
    if (!updated) {
      return res.status(404).json({ message: "Alert not found" });
    }
    res.json(updated);
  });

  // Seed default data if empty
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.getTimetables();
  if (existing.length === 0) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    for (const day of days) {
      await storage.updateTimetable(day, ["Free", "Free", "Free", "Free", "Free"]);
    }
  }
}
