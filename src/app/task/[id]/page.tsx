import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import TaskStepController from "@/components/TaskStepController";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([auth(), params]);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [task, userSettings, activeFocusSession] = await Promise.all([
    prisma.task.findUnique({
      where: { id, userId: session.user.id },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
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
  ]);

  if (!task) {
    notFound();
  }

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
      }}
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
