import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const pushSchema = z.object({
  changes: z.array(
    z.object({
      entity: z.enum(["professor", "school", "class", "student", "lessonLog"]),
      entityId: z.string().min(1),
      op: z.enum(["upsert", "delete"]),
      payload: z.any().nullable(),
      updatedAt: z.number()
    })
  )
});