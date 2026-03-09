import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getActiveTheme } from "@/lib/xp";
import TaskStepController from "@/components/TaskStepController";

async function getActiveFocusCount() {
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
  return prisma.focusRoomPresence.count({
    where: { lastPingAt: { gt: twoMinAgo } },
  });
}

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([auth(), params]);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [task, streak, userSettings, activeFocusSession, focusCount] =
    await Promise.all([
      prisma.task.findUnique({
        where: { id, userId: session.user.id },
        include: {
          steps: { orderBy: { orderIndex: "asc" } },
          timeEstimate: true,
          moodCheckIns: {
            select: { mood: true, timing: true },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      prisma.userStreak.findUnique({
        where: { userId: session.user.id },
        select: { totalXp: true },
      }),
      prisma.userSettings.findUnique({
        where: { userId: session.user.id },
        select: {
          eveningCutoffHour: true,
          eveningCutoffMin: true,
          enableEveningMode: true,
          enableFocusTimer: true,
        },
      }),
      prisma.focusSession.findFirst({
        where: { taskId: id, userId: session.user.id, endedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, timeLimitMin: true, startedAt: true },
      }),
      getActiveFocusCount(),
    ]);

  if (!task) {
    notFound();
  }

  const { colors: confettiColors } = getActiveTheme(streak?.totalXp ?? 0);

  const serializedTimeEstimate = task.timeEstimate
    ? {
        estimateMinutes: task.timeEstimate.estimateMinutes,
        startedAt: task.timeEstimate.startedAt.toISOString(),
        completedAt: task.timeEstimate.completedAt?.toISOString() ?? null,
        actualMinutes: task.timeEstimate.actualMinutes,
      }
    : null;

  const serializedFocusSession = activeFocusSession
    ? {
        id: activeFocusSession.id,
        timeLimitMin: activeFocusSession.timeLimitMin,
        startedAt: activeFocusSession.startedAt.toISOString(),
      }
    : null;

  return (
    <TaskStepController
      task={{
        id: task.id,
        title: task.title,
        createdAt: task.createdAt.toISOString(),
        deadline: task.deadline?.toISOString() ?? null,
        confettiColors,
        xpAwarded: task.xpAwarded,
        steps: task.steps.map((s) => ({
          id: s.id,
          content: s.content,
          isCompleted: s.isCompleted,
        })),
        moodCheckIns: task.moodCheckIns.map((m) => ({
          mood: m.mood,
          timing: m.timing,
        })),
      }}
      timeEstimate={serializedTimeEstimate}
      initialFocusCount={focusCount}
      userSettings={userSettings ?? undefined}
      focusSession={serializedFocusSession}
    />
  );
}
