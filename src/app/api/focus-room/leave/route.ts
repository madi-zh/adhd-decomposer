import { NextResponse, after } from "next/server";
import { parseBody, requireSession } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

async function handleLeave(request: Request): Promise<NextResponse> {
  try {
    const [auth, body] = await Promise.all([
      requireSession(),
      parseBody(request),
    ]);

    if (auth.error) return auth.error;

    const presenceId = body?.presenceId as string | undefined;

    if (!presenceId) {
      return NextResponse.json({ success: true });
    }

    // Defer the actual deletion -- the client does not need to wait for it,
    // and sendBeacon (POST) ignores the response body anyway.
    after(async () => {
      try {
        await prisma.focusRoomPresence.deleteMany({
          where: { id: presenceId, userId: auth.userId },
        });
      } catch (err) {
        logger.error({ err, route: "after /api/focus-room/leave" }, "Failed to delete presence record");
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err, route: "POST/DELETE /api/focus-room/leave" }, "Failed to leave focus room");
    return NextResponse.json(
      { error: "Failed to leave focus room." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  return handleLeave(request);
}

// POST handler for navigator.sendBeacon which always sends POST
export async function POST(request: Request): Promise<NextResponse> {
  return handleLeave(request);
}
