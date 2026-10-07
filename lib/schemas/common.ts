import { z } from "zod";
import { parseMoneyToMinor } from "@/lib/money";
import {
  DELIVERY_FAILURE_REASONS,
  PRIORITIES,
  SERVICE_LEVELS,
} from "@/types/domain";

export const optionalEmail = z
  .union([z.email("Enter a valid email address"), z.literal("")])
  .transform((value) => (value === "" ? undefined : value))
  .optional();

export const optionalPhone = z
  .string()
  .trim()
  .max(24)
  .transform((value) => (value === "" ? undefined : value))
  .optional();

/** Text money input ("12,500.00") → integer minor units, validated client and server. */
export const moneyField = z
  .string()
  .trim()
  .refine((value) => value === "" || parseMoneyToMinor(value) !== null, {
    message: "Enter a valid amount",
  });

export const dateField = z
  .string()
  .trim()
  .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), {
    message: "Enter a valid date",
  });

export const positiveNumberField = z
  .string()
  .trim()
  .refine((value) => value !== "" && Number.isFinite(Number(value)) && Number(value) > 0, {
    message: "Enter a number greater than 0",
  });

export const addressSchema = z.object({
  name: z.string().trim().min(2, "Recipient/sender name is required").max(120),
  phone: z.string().trim().min(7, "Phone number is required").max(24),
  email: optionalEmail,
  street: z.string().trim().min(3, "Street address is required").max(200),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(1, "State is required").max(100),
  country: z.string().trim().min(1, "Country is required").max(100).default("Nigeria"),
  postalCode: optionalPhone,
  landmark: optionalPhone,
});

export const packageSchema = z.object({
  description: z.string().trim().min(2, "Describe the contents").max(160),
  quantity: z.coerce.number().int().min(1, "At least 1 unit").max(999),
  weightKg: z.coerce.number().positive("Weight must be greater than 0").max(20000),
  lengthCm: z.coerce.number().positive("Length must be greater than 0").max(600),
  widthCm: z.coerce.number().positive("Width must be greater than 0").max(600),
  heightCm: z.coerce.number().positive("Height must be greater than 0").max(600),
  declaredValue: moneyField.optional(),
});

export const prioritySchema = z.enum(PRIORITIES);
export const serviceLevelSchema = z.enum(SERVICE_LEVELS);
export const failureReasonSchema = z.enum(DELIVERY_FAILURE_REASONS);

export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const output: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (output[key] ??= []).push(issue.message);
  }
  return output;
}
