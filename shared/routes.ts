
import { z } from 'zod';
import { insertTimetableSchema, insertAlertSchema, timetables, alerts } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  timetables: {
    list: {
      method: 'GET' as const,
      path: '/api/timetables',
      responses: {
        200: z.array(z.custom<typeof timetables.$inferSelect>()),
      },
    },
    update: {
      method: 'POST' as const, // Using POST for upsert logic
      path: '/api/timetables',
      input: z.object({
        day: z.string(),
        subjects: z.array(z.string())
      }),
      responses: {
        200: z.custom<typeof timetables.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  alerts: {
    list: {
      method: 'GET' as const,
      path: '/api/alerts',
      responses: {
        200: z.array(z.custom<typeof alerts.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/alerts',
      input: z.object({
        message: z.string()
      }),
      responses: {
        201: z.custom<typeof alerts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    markRead: {
      method: 'PATCH' as const,
      path: '/api/alerts/:id/read',
      responses: {
        200: z.custom<typeof alerts.$inferSelect>(),
      },
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
