/*
 * ProNax - Validation Schemas
 * Copyright (c) 2026. All rights reserved.
 * 
 * Commercial Single-End Product License.
 * Reselling, distributing, sublicensing, or sharing this codebase 
 * or any portion thereof without explicit written permission is strictly prohibited.
 */

/**
 * Shared Zod schemas. Every user-supplied payload that reaches the database
 * (directly or through an RPC) is parsed here first, and the same schemas are
 * used to render inline form errors.
 */
import { z } from "zod";

export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
export const ALLOWED_VIDEO_MIME = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

const trimmed = (max: number) => z.string().trim().max(max);

export const commentSchema = z.object({
  video_id: z.string().min(1).max(128),
  text: z
    .string()
    .trim()
    .min(1, { message: "Comment cannot be empty" })
    .max(2000, { message: "Comment must be under 2000 characters" }),
  parent_id: z.string().uuid().nullable().optional(),
});

export const videoMetadataSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { message: "Title must be at least 3 characters" })
    .max(150, { message: "Title must be under 150 characters" }),
  description: trimmed(5000).default(""),
  category: trimmed(64).optional(),
  tags: z.array(trimmed(40)).max(20, { message: "At most 20 tags" }).default([]),
  visibility: z.enum(["public", "unlisted", "private", "scheduled"]),
  monetization_enabled: z.boolean().default(false),
  scheduled_at: z.string().datetime().nullable().optional(),
});

export const withdrawalSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Enter a valid amount" })
    .positive({ message: "Amount must be greater than 0" })
    .max(100000, { message: "Amount exceeds the per-request limit" })
    .finite(),
  method: z.enum(["paypal", "bank", "crypto", "upi", "mobile_money"]),
  payment_details: z.record(z.string().trim().max(200)).default({}),
});

export const appealSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email" }).max(255),
  message: z
    .string()
    .trim()
    .min(10, { message: "Please describe your appeal (min 10 characters)" })
    .max(1000),
});

export const reportSchema = z.object({
  video_id: z.string().min(1).max(128),
  reason: z.string().trim().min(3).max(500),
});

export const profileUpdateSchema = z.object({
  display_name: trimmed(60).min(1, { message: "Display name is required" }),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, { message: "Handle must be at least 3 characters" })
    .max(30)
    .regex(/^[a-z0-9_.]+$/, {
      message: "Handle can use letters, numbers, dot and underscore only",
    }),
  bio: trimmed(500).default(""),
});

export const emailSchema = z.string().trim().email({ message: "Enter a valid email" }).max(255);

/** Validate an uploaded file against an allow-list of MIME types and a size cap. */
export function validateFile(
  file: File,
  kind: "video" | "image",
): { ok: true } | { ok: false; error: string } {
  const allowed: readonly string[] = kind === "video" ? ALLOWED_VIDEO_MIME : ALLOWED_IMAGE_MIME;
  const maxBytes = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!allowed.includes(file.type)) {
    return { ok: false, error: `Unsupported ${kind} format. Allowed: ${allowed.join(", ")}` };
  }
  if (file.size <= 0) return { ok: false, error: "File appears to be empty" };
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `File is too large. Maximum ${Math.round(maxBytes / (1024 * 1024))} MB`,
    };
  }
  return { ok: true };
}

/** Strip control characters and collapse whitespace before persisting text. */
export function sanitizeText(value: string, maxLength = 5000): string {
  return (
    value
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .replace(/\r\n/g, "\n")
      .trim()
      .slice(0, maxLength)
  );
}

/** Convert a ZodError into a single human-readable message. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  failures: string[];
  ok: boolean;
};

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "letmein",
  "welcome",
  "welcome1",
  "admin",
  "admin123",
  "iloveyou",
  "monkey",
  "dragon",
  "football",
  "baseball",
  "sunshine",
  "princess",
  "passw0rd",
  "trustno1",
  "abc123",
  "qwertyuiop",
  "starwars",
  "whatever",
  "zaq12wsx",
  "changeme",
  "pronax",
  "pronax123",
]);

export const MIN_PASSWORD_LENGTH = 12;

/** Password policy: >=12 chars, mixed case, digit, symbol, not a common password. */
export function checkPasswordStrength(password: string): PasswordStrength {
  const failures: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH)
    failures.push(`At least ${MIN_PASSWORD_LENGTH} characters`);
  if (!/[a-z]/.test(password)) failures.push("One lowercase letter");
  if (!/[A-Z]/.test(password)) failures.push("One uppercase letter");
  if (!/[0-9]/.test(password)) failures.push("One number");
  if (!/[^A-Za-z0-9]/.test(password)) failures.push("One special character");
  const normalized = password.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (COMMON_PASSWORDS.has(normalized)) failures.push("Too common — choose something unique");
  if (/^(.)\1+$/.test(password)) failures.push("Avoid repeating a single character");

  const passed = 6 - Math.min(failures.length, 6);
  const score = Math.max(0, Math.min(4, Math.round((passed / 6) * 4))) as 0 | 1 | 2 | 3 | 4;
  const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];
  return { score, label: labels[score], failures, ok: failures.length === 0 };
}

export const passwordSchema = z.string().superRefine((value, ctx) => {
  const result = checkPasswordStrength(value);
  for (const failure of result.failures) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: failure });
  }
});
