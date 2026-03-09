import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, findOwnedTask, parseBody } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";
import { VALID_MOOD_KEY_SET } from "@/lib/moods";

const VALID_TIMINGS = ["before", "after"] as const;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const [auth, body] = await Promise.all([
      requireSession(),
      parseBody(request),
    ]);
    if (auth.error) return auth.error;

    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const { taskId, mood, timing } = body;

    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json(
        { error: "Task ID is required." },
        { status: 400 }
      );
    }

    if (!VALID_MOOD_KEY_SET.has(mood as string)) {
      return NextResponse.json(
        { error: "Invalid mood value." },
        { status: 400 }
      );
    }

    if (!VALID_TIMINGS.includes(timing as typeof VALID_TIMINGS[number])) {
      return NextResponse.json(
        { error: "Invalid timing value." },
        { status: 400 }
      );
    }

    const task = await findOwnedTask(taskId, auth.userId);
    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const checkIn = await prisma.moodCheckIn.upsert({
      where: {
        taskId_userId_timing: { taskId, userId: auth.userId, timing: timing as string },
      },
      update: { mood: mood as string },
      create: {
        taskId,
        userId: auth.userId,
        mood: mood as string,
        timing: timing as string,
      },
    });

    return NextResponse.json({
      id: checkIn.id,
      mood: checkIn.mood,
      timing: checkIn.timing,
    });
  } catch (err) {
    logger.error({ err, route: "POST /api/mood" }, "Failed to save mood check-in");
    return NextResponse.json(
      { error: "Failed to save mood check-in." },
      { status: 500 }
    );
  }
}
