import { z } from "zod";

export const professorSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(6, "Telefone inválido"),
  mainInstitution: z.string().optional()
});

export const schoolSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  address: z.string().optional(),
  notes: z.string().optional()
});

export const classSchema = z.object({
  schoolId: z.string().min(1),
  name: z.string().min(2, "Nome muito curto"),
  schedule: z.string().optional(),
  notes: z.string().optional()
});

export const studentSchema = z.object({
  schoolId: z.string().min(1),
  classId: z.string().optional(),
  name: z.string().min(2, "Nome muito curto"),
  contact: z.string().optional(),
  notes: z.string().optional()
});

export const lessonLogSchema = z.object({
  schoolId: z.string().min(1),
  classId: z.string().min(1),
  studentId: z.string().min(1),
  date: z.number(),
  evolutionScore: z.number().min(0).max(10),
  needs: z.array(z.string()),
  repertoire: z.array(z.string()),
  plan: z.string()
});