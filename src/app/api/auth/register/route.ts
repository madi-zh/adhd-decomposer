import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { BCRYPT_SALT_ROUNDS, MIN_PASSWORD_LENGTH, normalizeEmail } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const { name, email, password } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email is required." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);

    const [existingUser, hashedPassword] = await Promise.all([
      prisma.user.findUnique({ where: { email: normalizedEmail } }),
      bcrypt.hash(password, BCRYPT_SALT_ROUNDS),
    ]);

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    await prisma.user.create({
      data: {
        name: name?.trim() || null,
        email: normalizedEmail,
        hashedPassword,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    logger.error({ err, route: "POST /api/auth/register" }, "Failed to create account");
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
