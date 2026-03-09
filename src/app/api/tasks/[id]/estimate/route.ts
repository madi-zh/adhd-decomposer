import { NextResponse } from "next/server";

import { findOwnedTask, requireSession } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { MAX_ESTIMATE_MINUTES, MIN_ESTIMATE_MINUTES } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [auth, { id }, body] = await Promise.all([
      requireSession(),
      params,
      request.json(),
    ]);
    if (auth.error) return auth.error;

    const task = await findOwnedTask(id, auth.userId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { estimateMinutes } = body;
    if (
      typeof estimateMinutes !== "number" ||
      !Number.isInteger(estimateMinutes) ||
      estimateMinutes < MIN_ESTIMATE_MINUTES ||
      estimateMinutes > MAX_ESTIMATE_MINUTES
    ) {
      return NextResponse.json(
        { error: `estimateMinutes must be an integer between ${MIN_ESTIMATE_MINUTES} and ${MAX_ESTIMATE_MINUTES}` },
        { status: 400 }
      );
    }

    const timeEstimate = await prisma.timeEstimate.create({
      data: {
        taskId: id,
        estimateMinutes,
        startedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: timeEstimate.id,
      taskId: timeEstimate.taskId,
      estimateMinutes: timeEstimate.estimateMinutes,
      startedAt: timeEstimate.startedAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err, route: "POST /api/tasks/[id]/estimate" }, "Failed to save estimate");
    return NextResponse.json(
      { error: "Failed to save estimate." },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [auth, { id }] = await Promise.all([requireSession(), params]);
    if (auth.error) return auth.error;

    const task = await findOwnedTask(id, auth.userId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const timeEstimate = await prisma.timeEstimate.findUnique({
      where: { taskId: id },
    });

    if (!timeEstimate) {
      return NextResponse.json({ error: "No estimate found" }, { status: 404 });
    }

    return NextResponse.json({
      id: timeEstimate.id,
      estimateMinutes: timeEstimate.estimateMinutes,
      startedAt: timeEstimate.startedAt.toISOString(),
      completedAt: timeEstimate.completedAt?.toISOString() ?? null,
      actualMinutes: timeEstimate.actualMinutes,
    });
  } catch (err) {
    logger.error({ err, route: "GET /api/tasks/[id]/estimate" }, "Failed to load estimate");
    return NextResponse.json(
      { error: "Failed to load estimate." },
      { status: 500 }
    );
  }
}
