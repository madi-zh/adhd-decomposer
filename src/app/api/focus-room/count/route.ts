import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { PRESENCE_TIMEOUT_MS } from "@/lib/focus-room";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    const activeCount = await prisma.focusRoomPresence.count({
      where: {
        lastPingAt: { gt: new Date(Date.now() - PRESENCE_TIMEOUT_MS) },
      },
    });

    return NextResponse.json({ activeCount });
  } catch (err) {
    logger.error({ err, route: "GET /api/focus-room/count" }, "Failed to get focus room count");
    return NextResponse.json(
      { error: "Failed to get focus room count." },
      { status: 500 }
    );
  }
}
