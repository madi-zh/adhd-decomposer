import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, token, password } = await request.json();

    if (!email || !token || !password) {
      return NextResponse.json(
        { error: "Email, token, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Hash new password before the transaction to avoid holding the lock during bcrypt
    const hashedPassword = await bcrypt.hash(password, 12);

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

      // Delete the token immediately to prevent reuse
      await tx.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: normalizedEmail,
            token: hashedToken,
          },
        },
      });

      if (verificationToken.expires < new Date()) {
        return { error: "Reset link has expired. Please request a new one." } as const;
      }

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
