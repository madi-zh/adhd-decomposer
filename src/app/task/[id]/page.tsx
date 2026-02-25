import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import TaskStepController from "@/components/TaskStepController";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });

  if (!task || task.userId !== session.user.id) {
    notFound();
  }

  return (
    <TaskStepController
      task={{
        id: task.id,
        title: task.title,
        status: task.status,
        steps: task.steps.map((s) => ({
          id: s.id,
          content: s.content,
          orderIndex: s.orderIndex,
          isCompleted: s.isCompleted,
        })),
      }}
    />
  );
}
