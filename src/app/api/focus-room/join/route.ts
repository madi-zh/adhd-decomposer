import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateAvatarSeed } from "@/lib/focus-room";

export async function POST(request: Request) {
  try {
    const [session, body] = await Promise.all([
      auth(),
      request.json().catch(() => ({})),
    ]);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = body as { taskId?: string };

    // Delete any stale presence for this user first
    await prisma.focusRoomPresence.deleteMany({
      where: { userId: session.user.id },
    });

    const avatarSeed = generateAvatarSeed(session.user.id);

    const presence = await prisma.focusRoomPresence.create({
      data: {
        userId: session.user.id,
        taskId: taskId || null,
        avatarSeed,
      },
    });

    const activeCount = await prisma.focusRoomPresence.count({
      where: {
        lastPingAt: { gt: new Date(Date.now() - 2 * 60 * 1000) },
      },
    });

    return NextResponse.json({
      presenceId: presence.id,
      avatarSeed,
      activeCount,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to join focus room." },
      { status: 500 }
    );
  }
}
