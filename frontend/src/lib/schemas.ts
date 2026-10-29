/**
 * Form validation rules. They mirror the backend's rules so users see problems
 * immediately — the backend still validates everything independently.
 */
import { z } from "zod";

export const PASSWORD_MIN = 10;

const password = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(128, "Use at most 128 characters")
  .refine((v) => v.trim().length > 0, "Password cannot be only spaces");

const email = z.string().trim().min(1, "Enter your email").email("Enter a valid email address").max(320);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name").max(120),
  email,
  password,
  // Must be ticked by the user; it starts unticked.
  accept_terms: z.boolean().refine((v) => v, "You need to accept the Terms and Conditions to create an account"),
});
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const newPasswordSchema = z
  .object({ new_password: password, confirm: z.string() })
  .refine((v) => v.new_password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;

export const changePasswordSchema = z
  .object({ current_password: z.string().min(1, "Enter your current password"), new_password: password, confirm: z.string() })
  .refine((v) => v.new_password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const profileSchema = z.object({ full_name: z.string().trim().min(1, "Enter your name").max(120) });
export type ProfileValues = z.infer<typeof profileSchema>;

const title = z.string().trim().min(1, "Give it a title").max(300, "Keep the title under 300 characters");

export const knowledgeSchema = z.object({
  title,
  content: z.string().max(100_000, "Content is too long (100,000 characters max)"),
  tags: z.array(z.string()).max(20, "Use at most 20 tags"),
  project_id: z.string().nullable(),
  related_ids: z.array(z.string()).max(20, "Link at most 20 related notes"),
});
export type KnowledgeValues = z.infer<typeof knowledgeSchema>;

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Give the project a name").max(200),
  description: z.string().max(5000, "Keep the description under 5,000 characters"),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
});
export type ProjectValues = z.infer<typeof projectSchema>;

const longText = z.string().max(20_000, "Keep this under 20,000 characters");
export const decisionSchema = z.object({
  title,
  context: longText,
  problem: longText,
  decision: longText,
  reasoning: longText,
  alternatives: longText,
  expected_outcome: longText,
  actual_outcome: longText,
  status: z.enum(["proposed", "accepted", "superseded", "reviewed"]),
  project_id: z.string().nullable(),
});
export type DecisionValues = z.infer<typeof decisionSchema>;

export const changeEmailSchema = z.object({ new_email: email, password: z.string().min(1, "Enter your password") });
export type ChangeEmailValues = z.infer<typeof changeEmailSchema>;
