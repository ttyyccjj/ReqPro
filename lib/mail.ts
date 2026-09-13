import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function appUrl() {
  const raw = process.env.AUTH_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function requestUrl(requestId: string) {
  return `${appUrl()}/requests/${requestId}`;
}

function smtpPort() {
  const parsed = Number(process.env.SMTP_PORT ?? 587);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.EMAIL_FROM?.trim());
}

function outboxDir() {
  return path.join(process.cwd(), "data", "mail-outbox");
}

function safeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
}

async function writeOutbox(message: MailMessage) {
  await mkdir(outboxDir(), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(
    outboxDir(),
    `${stamp}-${safeFilePart(message.to)}-${safeFilePart(message.subject)}.txt`,
  );
  const body = [
    `To: ${message.to}`,
    `From: ${process.env.EMAIL_FROM?.trim() || "ReqPro"}`,
    `Subject: ${message.subject}`,
    "",
    message.text,
    "",
  ].join("\n");
  await writeFile(file, body, "utf8");
}

async function sendSmtp(message: MailMessage) {
  const port = smtpPort();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

export async function sendMail(message: MailMessage) {
  if (smtpConfigured()) {
    await sendSmtp(message);
    return;
  }
  await writeOutbox(message);
}

export function scheduleMail(task: () => Promise<void>) {
  void task().catch((error) => {
    console.error("Request email failed:", error instanceof Error ? error.message : error);
  });
}
