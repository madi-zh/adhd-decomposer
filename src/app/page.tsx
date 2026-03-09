import TaskInput from "@/components/TaskInput";
import StreakBadge from "@/components/StreakBadge";
import FocusRoomBadge from "@/components/FocusRoomBadge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();

  const streak = session?.user?.id
    ? await prisma.userStreak.findUnique({
        where: { userId: session.user.id },
        select: { currentStreak: true, totalXp: true },
      })
    : null;

  return (
    <>
      {streak ? (
        <StreakBadge
          currentStreak={streak.currentStreak}
          totalXp={streak.totalXp}
        />
      ) : null}
      <div className="flex justify-center mb-4">
        <FocusRoomBadge />
      </div>
      <TaskInput />
    </>
  );
}
