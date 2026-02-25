import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateXp } from "@/lib/xp";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

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

    // Run task completion check and streak/XP update after response is sent
    after(async () => {
      const remainingSteps = await prisma.step.count({
        where: {
          taskId: updatedStep.taskId,
          isCompleted: false,
        },
      });

      if (remainingSteps === 0) {
        const [task, stepCount] = await Promise.all([
          prisma.task.update({
            where: { id: updatedStep.taskId },
            data: {
              status: "completed",
              completedAt: new Date(),
            },
          }),
          prisma.step.count({
            where: { taskId: updatedStep.taskId },
          }),
        ]);

        // Fetch or create UserStreak
        const userId = session.user!.id!;
        const streak = await prisma.userStreak.findUnique({
          where: { userId },
        });

        const today = todayDateString();
        const yesterday = yesterdayDateString();

        let newCurrentStreak: number;
        if (!streak) {
          newCurrentStreak = 1;
        } else if (streak.lastActiveDate === today) {
          // Already counted today — no streak change
          newCurrentStreak = streak.currentStreak;
        } else if (streak.lastActiveDate === yesterday) {
          newCurrentStreak = streak.currentStreak + 1;
        } else {
          // Gap or null — reset to 1
          newCurrentStreak = 1;
        }

        const completedBeforeDeadline =
          task.deadline !== null && new Date() <= task.deadline;

        const xp = calculateXp(
          stepCount,
          newCurrentStreak,
          completedBeforeDeadline
        );

        const newLongestStreak = Math.max(
          newCurrentStreak,
          streak?.longestStreak ?? 0
        );
        const newTotalXp = (streak?.totalXp ?? 0) + xp;

        await prisma.userStreak.upsert({
          where: { userId },
          create: {
            userId,
            currentStreak: newCurrentStreak,
            longestStreak: newLongestStreak,
            lastActiveDate: today,
            totalXp: newTotalXp,
          },
          update: {
            currentStreak: newCurrentStreak,
            longestStreak: newLongestStreak,
            lastActiveDate: today,
            totalXp: newTotalXp,
          },
        });

        await prisma.task.update({
          where: { id: updatedStep.taskId },
          data: { xpAwarded: xp },
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
