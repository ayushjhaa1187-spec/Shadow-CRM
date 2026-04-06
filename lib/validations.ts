import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  company: z.string().max(200).nullable().optional(),
  status: z.enum(["lead", "prospect", "customer", "churned"]).default("lead"),
  notes: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  last_contacted_at: z.string().datetime().nullable().optional(),
});

export const dealSchema = z.object({
  contact_id: z.string().uuid("Invalid contact ID"),
  title: z.string().min(1, "Title is required").max(300),
  value: z.number().min(0).default(0),
  currency: z.string().length(3).default("USD"),
  stage: z
    .enum(["discovery", "proposal", "negotiation", "closed_won", "closed_lost"])
    .default("discovery"),
  expected_close_date: z.string().datetime().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const activitySchema = z.object({
  contact_id: z.string().uuid("Invalid contact ID"),
  deal_id: z.string().uuid("Invalid deal ID").nullable().optional(),
  type: z.enum(["call", "email", "meeting", "note"]),
  description: z.string().min(1, "Description is required").max(5000),
  scheduled_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  chat_id: z.string().uuid().nullable().optional(),
});

export type ContactFormData = z.infer<typeof contactSchema>;
export type DealFormData = z.infer<typeof dealSchema>;
export type ActivityFormData = z.infer<typeof activitySchema>;
