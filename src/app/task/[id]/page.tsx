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

  const [task, focusCount] = await Promise.all([
    prisma.task.findUnique({
      where: { id, userId: session.user.id },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    }),
    getActiveFocusCount(),
  ]);

  if (!task) {
    notFound();
  }

  return (
    <TaskStepController
      task={{
        title: task.title,
        steps: task.steps.map((s) => ({
          id: s.id,
          content: s.content,
          isCompleted: s.isCompleted,
        })),
      }}
      initialFocusCount={focusCount}
      taskId={task.id}
    />
  );
}
