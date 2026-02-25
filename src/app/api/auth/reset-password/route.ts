import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";
import { NextResponse } from "next/server";

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

    const normalizedEmail = email.toLowerCase().trim();
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Start bcrypt early, await inside transaction after token lookup
    const hashedPasswordPromise = bcrypt.hash(password, 12);

    // Use a transaction to atomically validate the token and update the password
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

      // Check expiry before deleting so error messages stay consistent
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

      // Delete the token to prevent reuse
      await tx.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: normalizedEmail,
            token: hashedToken,
          },
        },
      });

      const hashedPassword = await hashedPasswordPromise;
      await tx.user.update({
        where: { email: normalizedEmail },
        data: { hashedPassword },
      });

      return { success: true } as const;
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
