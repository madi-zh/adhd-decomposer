import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [session, { id }, body] = await Promise.all([
      auth(),
      params,
      request.json(),
    ]);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const estimateMinutes = body.estimateMinutes;
    if (
      typeof estimateMinutes !== "number" ||
      !Number.isInteger(estimateMinutes) ||
      estimateMinutes < 1 ||
      estimateMinutes > 480
    ) {
      return NextResponse.json(
        { error: "estimateMinutes must be an integer between 1 and 480" },
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
  } catch {
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
    const [session, { id }] = await Promise.all([auth(), params]);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id, userId: session.user.id },
    });

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
  } catch {
    return NextResponse.json(
      { error: "Failed to load estimate." },
      { status: 500 }
    );
  }
}
