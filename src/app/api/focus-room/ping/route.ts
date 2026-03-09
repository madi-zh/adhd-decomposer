import { NextResponse, after } from "next/server";
import { parseBody, requireSession } from "@/lib/api-helpers";
import { PRESENCE_TIMEOUT_MS } from "@/lib/focus-room";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const STALE_CLEANUP_MS = 5 * 60 * 1000;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const [auth, body] = await Promise.all([
      requireSession(),
      parseBody(request),
    ]);

    if (auth.error) return auth.error;

    const presenceId = (body as Record<string, unknown> | null)?.presenceId as string | undefined;
    const stepContent = (body as Record<string, unknown> | null)?.stepContent as string | undefined;

    if (!presenceId) {
      return NextResponse.json(
        { error: "presenceId is required" },
        { status: 400 }
      );
    }

    // Update caller's lastPingAt and stepContent
    await prisma.focusRoomPresence.updateMany({
      where: { id: presenceId, userId: auth.userId },
      data: {
        lastPingAt: new Date(),
        stepContent: stepContent ? stepContent.slice(0, 50) : null,
      },
    });

    const twoMinAgo = new Date(Date.now() - PRESENCE_TIMEOUT_MS);

    // Get active users excluding caller
    const activeUsers = await prisma.focusRoomPresence.findMany({
      where: {
        lastPingAt: { gt: twoMinAgo },
        userId: { not: auth.userId },
      },
      select: {
        avatarSeed: true,
        stepContent: true,
        joinedAt: true,
      },
    });

    const totalActive = activeUsers.length + 1; // +1 for caller

    // Clean up stale records after the response is sent
    after(async () => {
      try {
        const fiveMinAgo = new Date(Date.now() - STALE_CLEANUP_MS);
        await prisma.focusRoomPresence.deleteMany({
          where: { lastPingAt: { lt: fiveMinAgo } },
        });
      } catch (err) {
        logger.error({ err, route: "after /api/focus-room/ping" }, "Failed to clean up stale presence records");
      }
    });

    return NextResponse.json({
      activeUsers: activeUsers.map((u) => ({
        avatarSeed: u.avatarSeed,
        stepContent: u.stepContent,
        minutesFocusing: Math.round(
          (Date.now() - u.joinedAt.getTime()) / 60000
        ),
      })),
      totalActive,
    });
  } catch (err) {
    logger.error({ err, route: "POST /api/focus-room/ping" }, "Failed to ping focus room");
    return NextResponse.json(
      { error: "Failed to ping focus room." },
      { status: 500 }
    );
  }
}
