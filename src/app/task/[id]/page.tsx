import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TaskStepController from "@/components/TaskStepController";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });

  if (!task) {
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
