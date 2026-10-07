import { z } from "zod";

export const signinSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type SigninInput = z.infer<typeof signinSchema>;

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.email("Enter a valid email address"),
    phone: z
      .string()
      .trim()
      .min(7, "Enter a reachable phone number")
      .max(24, "Phone number is too long"),
    companyName: z.string().trim().max(120).optional(),
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(128, "Password is too long"),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((value) => value === true, {
      message: "You must accept the terms to continue",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, "Reset token is missing or invalid"),
    password: z.string().min(8, "Use at least 8 characters").max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
