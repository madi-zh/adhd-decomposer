import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
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

  const [task, userSettings, activeFocusSession, focusCount] = await Promise.all([
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
    prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {},
      create: { userId: session.user.id },
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

  const timeEstimate = task.timeEstimate
    ? {
        estimateMinutes: task.timeEstimate.estimateMinutes,
        startedAt: task.timeEstimate.startedAt.toISOString(),
        completedAt: task.timeEstimate.completedAt?.toISOString() ?? null,
        actualMinutes: task.timeEstimate.actualMinutes,
      }
    : null;

  return (
    <TaskStepController
      task={{
        id: task.id,
        title: task.title,
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
      timeEstimate={timeEstimate}
      initialFocusCount={focusCount}
      userSettings={userSettings}
      focusSession={
        activeFocusSession
          ? {
              id: activeFocusSession.id,
              timeLimitMin: activeFocusSession.timeLimitMin,
              startedAt: activeFocusSession.startedAt.toISOString(),
            }
          : null
      }
    />
  );
}
