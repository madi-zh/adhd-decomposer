import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getUnlockedThemes } from "@/lib/xp";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const streak = await prisma.userStreak.findUnique({
      where: { userId: session.user.id },
    });

    if (!streak) {
      return NextResponse.json({
        currentStreak: 0,
        longestStreak: 0,
        totalXp: 0,
        lastActiveDate: null,
        unlockedThemes: ["default"],
        currentLevel: 0,
      });
    }

    return NextResponse.json({
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalXp: streak.totalXp,
      lastActiveDate: streak.lastActiveDate,
      unlockedThemes: getUnlockedThemes(streak.totalXp),
      currentLevel: Math.floor(streak.totalXp / 100),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch streak." },
      { status: 500 }
    );
  }
}
