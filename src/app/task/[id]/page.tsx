import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getActiveTheme } from "@/lib/xp";
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

  const [task, streak] = await Promise.all([
    prisma.task.findUnique({
      where: { id, userId: session.user.id },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    }),
    prisma.userStreak.findUnique({
      where: { userId: session.user.id },
      select: { totalXp: true },
    }),
  ]);

  if (!task) {
    notFound();
  }

  const totalXp = streak?.totalXp ?? 0;
  const { colors: confettiColors } = getActiveTheme(totalXp);

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
      }}
    />
  );
}
