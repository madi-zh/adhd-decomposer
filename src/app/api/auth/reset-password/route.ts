import crypto from "crypto";

import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { BCRYPT_SALT_ROUNDS, MIN_PASSWORD_LENGTH, normalizeEmail } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const { email, token, password } = await request.json();

    if (
      !email || typeof email !== "string" ||
      !token || typeof token !== "string" ||
      !password || typeof password !== "string"
    ) {
      return NextResponse.json(
        { error: "Email, token, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const hashedPasswordPromise = bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const result = await prisma.$transaction(async (tx) => {
      const verificationToken = await tx.verificationToken.findFirst({
        where: {
          identifier: normalizedEmail,
          token: hashedToken,
        },
      });

      if (!verificationToken) {
        return { error: "Invalid or expired reset link" } as const;
      }

      if (verificationToken.expires < new Date()) {
        await tx.verificationToken.delete({
          where: {
            identifier_token: {
              identifier: normalizedEmail,
              token: hashedToken,
            },
          },
        });
        return { error: "Reset link has expired. Please request a new one." } as const;
      }

      const hashedPassword = await hashedPasswordPromise;

      await Promise.all([
        tx.verificationToken.delete({
          where: {
            identifier_token: {
              identifier: normalizedEmail,
              token: hashedToken,
            },
          },
        }),
        tx.user.update({
          where: { email: normalizedEmail },
          data: { hashedPassword },
        }),
      ]);

      return { success: true } as const;
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err, route: "POST /api/auth/reset-password" }, "Failed to reset password");
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
