import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const [session, body] = await Promise.all([
      auth(),
      request.json().catch(() => ({})),
    ]);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { presenceId, stepContent } = body as {
      presenceId?: string;
      stepContent?: string;
    };

    if (!presenceId) {
      return NextResponse.json(
        { error: "presenceId is required" },
        { status: 400 }
      );
    }

    // Update caller's lastPingAt and stepContent
    await prisma.focusRoomPresence.updateMany({
      where: { id: presenceId, userId: session.user.id },
      data: {
        lastPingAt: new Date(),
        stepContent: stepContent ? stepContent.slice(0, 50) : null,
      },
    });

    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);

    // Get active users excluding caller
    const activeUsers = await prisma.focusRoomPresence.findMany({
      where: {
        lastPingAt: { gt: twoMinAgo },
        userId: { not: session.user.id },
      },
      select: {
        avatarSeed: true,
        stepContent: true,
        joinedAt: true,
      },
    });

    const totalActive = activeUsers.length + 1; // +1 for caller

    // Clean up stale records in after() — non-blocking
    after(async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      await prisma.focusRoomPresence.deleteMany({
        where: { lastPingAt: { lt: fiveMinAgo } },
      });
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
