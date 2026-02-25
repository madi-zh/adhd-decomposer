import TaskInput from "@/components/TaskInput";
import StreakBadge from "@/components/StreakBadge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();

  let streak: { currentStreak: number; totalXp: number } | null = null;
  if (session?.user?.id) {
    streak = await prisma.userStreak.findUnique({
      where: { userId: session.user.id },
      select: { currentStreak: true, totalXp: true },
    });
  }

  return (
    <>
      {streak && streak.currentStreak >= 1 ? (
        <StreakBadge
          currentStreak={streak.currentStreak}
          totalXp={streak.totalXp}
        />
      ) : null}
      <TaskInput />
    </>
  );
}
