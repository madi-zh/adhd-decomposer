import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const [session, body] = await Promise.all([auth(), request.json()]);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, timeLimitMin } = body;

    if (!taskId || typeof timeLimitMin !== "number" || timeLimitMin < 5 || timeLimitMin > 180) {
      return NextResponse.json(
        { error: "taskId required, timeLimitMin must be 5-180." },
        { status: 400 }
      );
    }

    // Verify the task belongs to this user
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId: session.user.id },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const focusSession = await prisma.focusSession.create({
      data: {
        taskId,
        userId: session.user.id,
        timeLimitMin,
        startedAt: new Date(),
      },
      select: {
        id: true,
        taskId: true,
        timeLimitMin: true,
        startedAt: true,
      },
    });

    return NextResponse.json(focusSession, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create focus session." },
      { status: 500 }
    );
  }
}
