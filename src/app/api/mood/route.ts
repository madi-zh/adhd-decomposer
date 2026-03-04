import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { VALID_MOOD_KEYS } from "@/lib/moods";
import { requireSession, findOwnedTask } from "@/lib/api-helpers";

const VALID_TIMINGS = ["before", "after"];

export async function POST(request: Request) {
  try {
    const [auth, body] = await Promise.all([
      requireSession(),
      request.json().catch(() => null),
    ]);

    if (auth.error) return auth.error;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
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

    if (!VALID_MOOD_KEYS.includes(mood)) {
      return NextResponse.json(
        { error: "Invalid mood value." },
        { status: 400 }
      );
    }

    if (!VALID_TIMINGS.includes(timing)) {
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
        taskId_userId_timing: { taskId, userId: auth.userId, timing },
      },
      update: { mood },
      create: {
        taskId,
        userId: auth.userId,
        mood,
        timing,
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
