import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decomposeTask } from "@/lib/claude";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

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
        { status: 400 },
      );
    }

    const { input } = body;

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return NextResponse.json(
        { error: "Please enter a task to break down." },
        { status: 400 },
      );
    }

    const trimmed = input.trim();

    const result = await decomposeTask(trimmed);

    const task = await prisma.task.create({
      data: {
        title: result.title,
        rawInput: trimmed,
        userId: session.user.id,
        steps: {
          create: result.steps.map((content, index) => ({
            content,
            orderIndex: index,
          })),
        },
      },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });

    return NextResponse.json(task);
  } catch (err) {
    logger.error({ err, route: "POST /api/tasks" }, "Failed to decompose task");
    return NextResponse.json(
      { error: "Failed to break down task. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await prisma.task.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        completedAt: true,
        _count: { select: { steps: true } },
      },
    });

    return NextResponse.json(tasks);
  } catch (err) {
    logger.error({ err, route: "GET /api/tasks" }, "Failed to load tasks");
    return NextResponse.json(
      { error: "Failed to load tasks." },
      { status: 500 },
    );
  }
}
