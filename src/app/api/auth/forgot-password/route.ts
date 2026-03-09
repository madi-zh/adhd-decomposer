import crypto from "crypto";

import { NextResponse, after } from "next/server";

import { sendPasswordResetEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json({ success: true });
    }

    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: hashedToken,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

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
