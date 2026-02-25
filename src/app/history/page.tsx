import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import TaskHistoryCard from "@/components/TaskHistoryCard";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      completedAt: true,
      _count: { select: { steps: true } },
    },
  });

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center pt-24 text-center">
        <p className="text-stone-400 text-lg mb-4">No tasks yet</p>
        <Link
          href="/"
          className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
        >
          Break down your first task
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Your tasks</h1>
      <div className="flex flex-col gap-3">
        {tasks.map((task) => (
          <TaskHistoryCard
            key={task.id}
            id={task.id}
            title={task.title}
            stepCount={task._count.steps}
            completedAt={task.completedAt?.toISOString() ?? null}
            status={task.status}
          />
        ))}
      </div>
    </div>
  );
}
