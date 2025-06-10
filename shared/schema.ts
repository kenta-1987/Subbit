import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  plan: text("plan").notNull().default("free"), // free, starter, creator, pro
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("inactive"), // active, inactive, canceled, past_due
  currentPeriodEnd: timestamp("current_period_end"),
  monthlyUploads: integer("monthly_uploads").notNull().default(0),
  lastUploadReset: timestamp("last_upload_reset").defaultNow(),
  storageUsed: integer("storage_used").notNull().default(0), // bytes used
  createdAt: timestamp("created_at").defaultNow(),
});

// Email verification tokens table
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment history table for financial tracking
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  amount: integer("amount").notNull(), // amount in cents
  currency: text("currency").notNull().default("jpy"),
  plan: text("plan").notNull(), // starter, creator, business
  status: text("status").notNull(), // succeeded, pending, failed
  paymentMethod: text("payment_method"), // card, bank_transfer, etc
  description: text("description"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

// Registration schema with password validation
export const registerUserSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  username: z.string().min(3, "ユーザー名は3文字以上で入力してください").max(50, "ユーザー名は50文字以下で入力してください"),
  password: z.string()
    .min(8, "パスワードは8文字以上で入力してください")
    .refine((password) => {
      const hasLowercase = /[a-z]/.test(password);
      const hasUppercase = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSymbol = /[^a-zA-Z0-9]/.test(password);
      
      const conditions = [hasLowercase, hasUppercase, hasNumber, hasSymbol];
      const metConditions = conditions.filter(Boolean).length;
      
      return metConditions >= 3;
    }, "パスワードは大文字、小文字、数字、記号のうち少なくとも3つを含む必要があります"),
});

// Email verification schema
export const verifyEmailSchema = z.object({
  token: z.string().min(1, "認証トークンが必要です"),
  password: z.string()
    .min(8, "パスワードは8文字以上で入力してください")
    .refine((password) => {
      const hasLowercase = /[a-z]/.test(password);
      const hasUppercase = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSymbol = /[^a-zA-Z0-9]/.test(password);
      
      const conditions = [hasLowercase, hasUppercase, hasNumber, hasSymbol];
      const metConditions = conditions.filter(Boolean).length;
      
      return metConditions >= 3;
    }, "パスワードは大文字、小文字、数字、記号のうち少なくとも3つを含む必要があります"),
});

// Password reset schema
export const requestPasswordResetSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "リセットトークンが必要です"),
  password: z.string()
    .min(8, "パスワードは8文字以上で入力してください")
    .refine((password) => {
      const hasLowercase = /[a-z]/.test(password);
      const hasUppercase = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSymbol = /[^a-zA-Z0-9]/.test(password);
      
      const conditions = [hasLowercase, hasUppercase, hasNumber, hasSymbol];
      const metConditions = conditions.filter(Boolean).length;
      
      return metConditions >= 3;
    }, "パスワードは大文字、小文字、数字、記号のうち少なくとも3つを含む必要があります"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type VerifyEmail = z.infer<typeof verifyEmailSchema>;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type RequestPasswordReset = z.infer<typeof requestPasswordResetSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;

// Plan configuration
export const PLAN_CONFIGS = {
  free: {
    name: "Free",
    price: 0,
    monthlyUploads: 3,
    maxDuration: 5 * 60, // 5 minutes in seconds
    storageLimit: 500 * 1024 * 1024, // 500MB in bytes
    hasWatermark: true,
    customSubtitles: false,
    features: ["Whisper自動字幕", "固定（変更不可）"]
  },
  starter: {
    name: "Starter", 
    price: 500,
    monthlyUploads: 5,
    maxDuration: 10 * 60, // 10 minutes in seconds
    storageLimit: 2 * 1024 * 1024 * 1024, // 2GB in bytes
    hasWatermark: false,
    customSubtitles: true,
    features: ["Whisper自動字幕", "サイズ・色変更可能"]
  },
  creator: {
    name: "Creator",
    price: 1000,
    monthlyUploads: 30,
    maxDuration: 10 * 60, // 10 minutes in seconds
    storageLimit: 10 * 1024 * 1024 * 1024, // 10GB in bytes
    hasWatermark: false,
    customSubtitles: true,
    features: ["Whisper自動字幕", "話者識別", "話者別字幕カスタム", "翻訳・リライト機能", "画質選択（エクスポート時）"]
  },
  pro: {
    name: "Pro",
    price: 3000,
    monthlyUploads: 50,
    maxDuration: 30 * 60, // 30 minutes in seconds
    storageLimit: 50 * 1024 * 1024 * 1024, // 50GB in bytes
    hasWatermark: false,
    customSubtitles: true,
    features: ["Whisper自動字幕", "話者識別", "話者別字幕カスタム", "翻訳・リライト機能", "画質選択（エクスポート時）"]
  }
} as const;

export type PlanType = keyof typeof PLAN_CONFIGS;

// Video processing table
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalPath: text("original_path").notNull(),
  processedPath: text("processed_path"),
  status: text("status").notNull().default("uploaded"), // uploaded, processing, completed, failed
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  fileSize: integer("file_size").notNull(),
  duration: integer("duration"),
  error: text("error"),
});

export const insertVideoSchema = createInsertSchema(videos).pick({
  filename: true,
  originalPath: true,
  fileSize: true,
  status: true,
});

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

// Captions table
export const captions = pgTable("captions", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull(),
  startTime: integer("start_time").notNull(), // in milliseconds
  endTime: integer("end_time").notNull(), // in milliseconds
  text: text("text").notNull(),
  font: text("font").default("gothic"),
  fontSize: text("font_size").default("medium"),
  color: text("color").default("white"),
  hasBackground: boolean("has_background").default(true),
});

export const insertCaptionSchema = createInsertSchema(captions).pick({
  videoId: true,
  startTime: true,
  endTime: true,
  text: true,
  font: true,
  fontSize: true,
  color: true,
  hasBackground: true,
});

export const updateCaptionSchema = createInsertSchema(captions).pick({
  startTime: true,
  endTime: true,
  text: true,
  font: true,
  fontSize: true,
  color: true,
  hasBackground: true,
});

export type InsertCaption = z.infer<typeof insertCaptionSchema>;
export type UpdateCaption = z.infer<typeof updateCaptionSchema>;
export type Caption = typeof captions.$inferSelect;

// Payment types
export const insertPaymentSchema = createInsertSchema(payments).pick({
  userId: true,
  stripePaymentIntentId: true,
  stripeSubscriptionId: true,
  amount: true,
  currency: true,
  plan: true,
  status: true,
  paymentMethod: true,
  description: true,
  paidAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Types for the API
export interface CaptionData {
  id: number;
  videoId: number;
  startTime: number;
  endTime: number;
  text: string;
  font: string;
  fontSize: string;
  color: string;
  hasBackground?: boolean;
}

export interface VideoStatusResponse {
  id: number;
  filename?: string;
  status: string;
  progress?: number;
  currentStep?: string;
  error?: string | null;
}

export interface ExportSettings {
  format: string;
  quality: string;
  resolution: string;
  defaultFont: string;
  backgroundStyle: string;
  position: string;
  accessibilityMode: boolean;
}
