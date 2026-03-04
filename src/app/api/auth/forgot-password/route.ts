import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { NextResponse, after } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Delete any existing tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });

    // Generate token and its hash
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Store hashed token with 1-hour expiry
    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: hashedToken,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // Send email after response is returned (non-blocking)
    after(async () => {
      await sendPasswordResetEmail(normalizedEmail, token);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err, route: "POST /api/auth/forgot-password" }, "Failed to process password reset request");
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
