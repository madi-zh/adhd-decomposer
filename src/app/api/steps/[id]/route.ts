import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [session, { id }] = await Promise.all([auth(), params]);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership through the parent task
    const step = await prisma.step.findUnique({
      where: { id },
      include: { task: { select: { userId: true } } },
    });

    if (!step || step.task.userId !== session.user.id) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    const updatedStep = await prisma.step.update({
      where: { id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    // Run task completion check after response is sent
    after(async () => {
      const remainingSteps = await prisma.step.count({
        where: {
          taskId: updatedStep.taskId,
          isCompleted: false,
        },
      });

      if (remainingSteps === 0) {
        const now = new Date();
        const [, estimate] = await Promise.all([
          prisma.task.update({
            where: { id: updatedStep.taskId },
            data: { status: "completed", completedAt: now },
          }),
          prisma.timeEstimate.findUnique({
            where: { taskId: updatedStep.taskId },
          }),
        ]);
        if (estimate && !estimate.completedAt) {
          const actual = Math.round(
            (now.getTime() - estimate.startedAt.getTime()) / 60000
          );
          await prisma.timeEstimate.update({
            where: { id: estimate.id },
            data: { completedAt: now, actualMinutes: actual },
          });
        }
      }
    });

    return NextResponse.json({ step: updatedStep });
  } catch (err) {
    logger.error({ err, route: "PATCH /api/steps/[id]" }, "Failed to update step");
    return NextResponse.json(
      { error: "Failed to update step." },
      { status: 500 }
    );
  }
}
