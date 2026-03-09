import { NextResponse } from "next/server";
import { parseBody, requireSession } from "@/lib/api-helpers";
import { generateAvatarSeed, PRESENCE_TIMEOUT_MS } from "@/lib/focus-room";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const [auth, body] = await Promise.all([
      requireSession(),
      parseBody(request),
    ]);

    if (auth.error) return auth.error;

    const taskId = (body as Record<string, unknown> | null)?.taskId as string | undefined;

    // Delete any stale presence for this user, then create fresh entry
    await prisma.focusRoomPresence.deleteMany({
      where: { userId: auth.userId },
    });

    const avatarSeed = generateAvatarSeed(auth.userId);

    const [presence, activeCount] = await Promise.all([
      prisma.focusRoomPresence.create({
        data: {
          userId: auth.userId,
          taskId: taskId || null,
          avatarSeed,
        },
      }),
      prisma.focusRoomPresence.count({
        where: {
          lastPingAt: { gt: new Date(Date.now() - PRESENCE_TIMEOUT_MS) },
        },
      }),
    ]);

    return NextResponse.json({
      presenceId: presence.id,
      avatarSeed,
      activeCount,
    });
  } catch (err) {
    logger.error({ err, route: "POST /api/focus-room/join" }, "Failed to join focus room");
    return NextResponse.json(
      { error: "Failed to join focus room." },
      { status: 500 }
    );
  }
}
