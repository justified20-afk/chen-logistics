import { z } from "zod";
import { ROLE_KEYS } from "@/types/permissions";
import { USER_STATUSES } from "@/types/domain";

export const userSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.email("Enter a valid email address"),
  role: z.enum(ROLE_KEYS),
  status: z.enum(USER_STATUSES),
  phone: z.string().trim().max(24).optional(),
  hubId: z.string().optional(),
  driverId: z.string().optional(),
  customerId: z.string().optional(),
  /** Only applied when present — editing a user without it keeps the password. */
  password: z.string().min(8, "Use at least 8 characters").max(128).optional(),
  sendInvite: z.boolean().optional(),
});
export type UserInput = z.infer<typeof userSchema>;

export const roleUpdateSchema = z.object({
  roleId: z.string().min(1),
  permissions: z.array(z.string().min(1)).max(200),
  description: z.string().trim().max(400).optional(),
});

export const settingsSchema = z.object({
  companyName: z.string().trim().min(2, "Company name is required").max(120),
  tagline: z.string().trim().max(160),
  currency: z.string().trim().min(3).max(8),
  timezone: z.string().trim().min(1).max(64),
  defaultOriginHubId: z.string().optional(),
  defaultServiceLevel: z.enum(["standard", "express", "same_day"]),
  delayThresholdHours: z.coerce.number().int().min(1).max(720),
  complianceWarningDays: z.coerce.number().int().min(1).max(365),
  invoicePrefix: z
    .string()
    .trim()
    .min(2, "Prefix is required")
    .max(10)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and dashes only"),
  codEnabled: z.boolean(),
  capacityWarningRatio: z.coerce.number().min(0.1).max(1),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password: z.string().min(8, "Use at least 8 characters").max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
