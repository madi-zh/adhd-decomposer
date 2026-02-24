import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const step = await prisma.step.update({
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
          taskId: step.taskId,
          isCompleted: false,
        },
      });

      if (remainingSteps === 0) {
        await prisma.task.update({
          where: { id: step.taskId },
          data: {
            status: "completed",
            completedAt: new Date(),
          },
        });
      }
    });

    return NextResponse.json({ step });
  } catch {
    return NextResponse.json(
      { error: "Failed to update step." },
      { status: 500 }
    );
  }
}
