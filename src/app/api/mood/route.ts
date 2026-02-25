import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const VALID_MOODS = ["calm", "excited", "anxious", "frustrated", "tired"];
const VALID_TIMINGS = ["before", "after"];

export async function POST(request: Request) {
  try {
    const [session, body] = await Promise.all([
      auth(),
      request.json().catch(() => null),
    ]);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    if (!VALID_MOODS.includes(mood)) {
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

    // Verify task ownership
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId: session.user.id },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const checkIn = await prisma.moodCheckIn.create({
      data: {
        taskId,
        userId: session.user.id,
        mood,
        timing,
      },
    });

    return NextResponse.json({
      id: checkIn.id,
      mood: checkIn.mood,
      timing: checkIn.timing,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to save mood check-in." },
      { status: 500 }
    );
  }
}
