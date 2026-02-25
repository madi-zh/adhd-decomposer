import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

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
        await prisma.task.update({
          where: { id: updatedStep.taskId },
          data: {
            status: "completed",
            completedAt: new Date(),
          },
        });
      }
    });

    return NextResponse.json({ step: updatedStep });
  } catch {
    return NextResponse.json(
      { error: "Failed to update step." },
      { status: 500 }
    );
  }
}
