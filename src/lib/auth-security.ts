import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";

export function clientIp(request: Request) {
  return request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Database-backed fixed-window rate limit shared across application instances. */
export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  key = createHash("sha256").update(key).digest("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + windowSeconds * 1000);
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO auth_rate_limits (key, count, window_started_at, expires_at)
    VALUES (${key}, 1, ${now}, ${expires})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN auth_rate_limits.window_started_at <= ${new Date(now.getTime() - windowSeconds * 1000)}
        THEN 1 ELSE auth_rate_limits.count + 1 END,
      window_started_at = CASE
        WHEN auth_rate_limits.window_started_at <= ${new Date(now.getTime() - windowSeconds * 1000)}
        THEN ${now} ELSE auth_rate_limits.window_started_at END,
      expires_at = CASE
        WHEN auth_rate_limits.window_started_at <= ${new Date(now.getTime() - windowSeconds * 1000)}
        THEN ${expires} ELSE auth_rate_limits.expires_at END
    RETURNING count
  `;
  return (rows[0]?.count ?? limit + 1) <= limit;
}

export function makeCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Codes are stored as keyed hashes so a database leak does not reveal usable codes. */
export function hashCode(code: string) {
  const secret = process.env.AUTH_CODE_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_CODE_SECRET or a 32-character JWT_SECRET is required.");
  return createHash("sha256").update(secret).update(":").update(code).digest("hex");
}

export async function sendAuthCode(email: string, code: string, purpose: "email_verification" | "password_reset") {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    throw new Error("EmailJS is not configured. Set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY and EMAILJS_PRIVATE_KEY.");
  }

  const isReset = purpose === "password_reset";
  const subject = isReset ? "Your Visitorly password reset code" : "Verify your Visitorly email";
  const heading = isReset ? "Reset your password" : "Verify your email address";
  const message = isReset
    ? "Use this code to choose a new password. If you did not request this, you can ignore this email."
    : "Enter this code in Visitorly to verify your email address.";

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        to_email: email,
        email: email,
        subject,
        heading,
        message,
        code,
        expires_in: "10 minutes",
        app_name: "Visitorly",
        purpose: isReset ? "password_reset" : "email_verification",
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const providerMessage = await response.text().catch(() => "");
    console.error("EmailJS delivery failed:", response.status, providerMessage.slice(0, 500));
    throw new Error(`EmailJS rejected the email request (${response.status}).`);
  }
}

export async function issueAuthCode(userId: number, email: string, purpose: "email_verification" | "password_reset") {
  const code = makeCode();

  await prisma.authCode.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.authCode.create({
    data: {
      userId,
      purpose,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await sendAuthCode(email, code, purpose);
}
