import { NextResponse, after } from "next/server";

import { requireSession } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
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
    const [auth, { id }] = await Promise.all([requireSession(), params]);
    if (auth.error) return auth.error;

    const step = await prisma.step.findUnique({
      where: { id },
      include: { task: { select: { userId: true } } },
    });

    if (!step || step.task.userId !== auth.userId) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    const updatedStep = await prisma.step.update({
      where: { id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    after(async () => {
      const remainingSteps = await prisma.step.count({
        where: {
          taskId: updatedStep.taskId,
          isCompleted: false,
        },
      });

      if (remainingSteps !== 0) return;

      const now = new Date();
      const userId = auth.userId;
      const [task, estimate, stepCount, streak] = await Promise.all([
        prisma.task.update({
          where: { id: updatedStep.taskId },
          data: { status: "completed", completedAt: now },
        }),
        prisma.timeEstimate.findUnique({
          where: { taskId: updatedStep.taskId },
        }),
        prisma.step.count({
          where: { taskId: updatedStep.taskId },
        }),
        prisma.userStreak.findUnique({
          where: { userId },
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

      const today = todayDateString();
      const yesterday = yesterdayDateString();

      let newCurrentStreak: number;
      if (!streak) {
        newCurrentStreak = 1;
      } else if (streak.lastActiveDate === today) {
        newCurrentStreak = streak.currentStreak;
      } else if (streak.lastActiveDate === yesterday) {
        newCurrentStreak = streak.currentStreak + 1;
      } else {
        newCurrentStreak = 1;
      }

      const completedBeforeDeadline =
        task.deadline !== null && now <= task.deadline;

      const xp = calculateXp(stepCount, newCurrentStreak, completedBeforeDeadline);

      const newLongestStreak = Math.max(
        newCurrentStreak,
        streak?.longestStreak ?? 0
      );
      const newTotalXp = (streak?.totalXp ?? 0) + xp;

      const streakData = {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastActiveDate: today,
        totalXp: newTotalXp,
      };

      await Promise.all([
        prisma.userStreak.upsert({
          where: { userId },
          create: { userId, ...streakData },
          update: streakData,
        }),
        prisma.task.update({
          where: { id: updatedStep.taskId },
          data: { xpAwarded: xp },
        }),
      ]);
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
