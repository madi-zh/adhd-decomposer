import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, findOwnedTask } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const [auth, body] = await Promise.all([
      requireSession(),
      request.json().catch(() => null),
    ]);
    if (auth.error) return auth.error;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { taskId, timeLimitMin } = body;

    if (
      typeof taskId !== "string" ||
      typeof timeLimitMin !== "number" ||
      timeLimitMin < 5 ||
      timeLimitMin > 180
    ) {
      return NextResponse.json(
        { error: "taskId required, timeLimitMin must be 5-180." },
        { status: 400 }
      );
    }

    const task = await findOwnedTask(taskId, auth.userId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const focusSession = await prisma.focusSession.create({
      data: {
        taskId,
        userId: auth.userId,
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
  } catch (err) {
    logger.error({ err, route: "POST /api/focus-session" }, "Failed to create focus session");
    return NextResponse.json(
      { error: "Failed to create focus session." },
      { status: 500 }
    );
  }
}
