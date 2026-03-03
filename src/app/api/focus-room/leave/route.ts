import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

async function handleLeave(request: Request) {
  try {
    const [session, body] = await Promise.all([
      auth(),
      request.json().catch(() => ({})),
    ]);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { presenceId } = body as { presenceId?: string };

    if (presenceId) {
      await prisma.focusRoomPresence.deleteMany({
        where: { id: presenceId, userId: session.user.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err, route: "POST/DELETE /api/focus-room/leave" }, "Failed to leave focus room");
    return NextResponse.json(
      { error: "Failed to leave focus room." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  return handleLeave(request);
}

// POST handler for navigator.sendBeacon which always sends POST
export async function POST(request: Request) {
  return handleLeave(request);
}
