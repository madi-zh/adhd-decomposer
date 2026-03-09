import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    const streak = await prisma.userStreak.findUnique({
      where: { userId: auth.userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        totalXp: true,
        lastActiveDate: true,
      },
    });

    if (!streak) {
      return NextResponse.json({
        currentStreak: 0,
        longestStreak: 0,
        totalXp: 0,
        lastActiveDate: null,
      });
    }

    return NextResponse.json(streak);
  } catch (err) {
    logger.error({ err, route: "GET /api/user/streak" }, "Failed to fetch streak");
    return NextResponse.json(
      { error: "Failed to fetch streak." },
      { status: 500 }
    );
  }
}
