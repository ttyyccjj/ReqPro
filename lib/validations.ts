import { z } from "zod";
import { parseAmountInput } from "@/lib/format";

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "validation.nameRequired").max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z
    .string()
    .min(8, "validation.passwordMin")
    .max(128),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "validation.currentRequired").max(128),
    password: z
      .string()
      .min(8, "validation.passwordMin")
      .max(128),
    confirmPassword: z.string().min(1, "validation.confirmRequired").max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"],
  })
  .refine((value) => value.password !== value.currentPassword, {
    message: "validation.passwordSame",
    path: ["password"],
  });

export const requestSchema = z.object({
  title: z.string().trim().min(1, "validation.titleRequired").max(120),
  details: z.string().trim().min(1, "validation.detailsRequired").max(4000),
  typeId: z.string().min(1, "validation.typeRequired"),
  currency: z.enum(["PHP", "JPY"]).optional(),
  amount: z
    .string()
    .trim()
    .optional()
    .transform((value, ctx) => {
      if (!value) return undefined;
      const parsed = parseAmountInput(value);
      if (parsed == null) {
        ctx.addIssue({
          code: "custom",
          message: "validation.amountInvalid",
        });
        return z.NEVER;
      }
      return parsed;
    }),
}).transform((value) => {
  if (value.amount != null && value.currency === "JPY") {
    return { ...value, amount: Math.round(value.amount) };
  }
  return value;
});

export const stepActionSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["passed", "approved", "sent_back", "rejected"]),
  comment: z.string().trim().max(1000).optional(),
});

export const retractSchema = z.object({
  requestId: z.string().min(1),
  comment: z
    .string()
    .trim()
    .min(1, "validation.retractReason")
    .max(1000),
});

export const setPersonSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["member", "admin"]),
  positionId: z.string().min(1).nullable(),
  departmentId: z.string().min(1).nullable(),
});

export const positionNameSchema = z.object({
  name: z.string().trim().min(1, "validation.positionNameRequired").max(80),
});

export const renamePositionSchema = z.object({
  positionId: z.string().min(1),
  name: z.string().trim().min(1, "validation.positionNameRequired").max(80),
});

export const departmentNameSchema = z.object({
  name: z.string().trim().min(1, "validation.departmentNameRequired").max(80),
});

export const renameDepartmentSchema = z.object({
  departmentId: z.string().min(1),
  name: z.string().trim().min(1, "validation.departmentNameRequired").max(80),
});

export const requestTypeNameSchema = z.object({
  name: z.string().trim().min(1, "validation.typeNameRequired").max(80),
});

export const renameRequestTypeSchema = z.object({
  typeId: z.string().min(1),
  name: z.string().trim().min(1, "validation.typeNameRequired").max(80),
});

export const setActiveSchema = z.object({
  id: z.string().min(1),
  active: z.enum(["true", "false"]),
});

export const logCursorSchema = z
  .string()
  .regex(/^\d+:[0-9a-f-]{36}$/i, "validation.logsPageInvalid");

export const saveRouteStepsSchema = z.object({
  steps: z
    .array(
      z.object({
        kind: z.enum(["review", "approve"]),
        positionId: z.string().min(1),
        rule: z.enum(["at_least_1", "everyone"]),
      }),
    )
    .min(1, "validation.addStep")
    .max(20, "validation.maxSteps"),
}).refine((value) => value.steps.some((step) => step.kind === "approve"), {
  message: "validation.keepApprove",
});
