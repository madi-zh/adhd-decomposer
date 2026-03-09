import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [auth, { id }, body] = await Promise.all([
      requireSession(),
      params,
      request.json().catch(() => null),
    ]);
    if (auth.error) return auth.error;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { action } = body;

    if (action === "end") {
      const updated = await prisma.focusSession.updateMany({
        where: { id, userId: auth.userId },
        data: { endedAt: new Date() },
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      return NextResponse.json({ id, endedAt: new Date() });
    }

    if (action === "nudge") {
      const updated = await prisma.focusSession.updateMany({
        where: { id, userId: auth.userId },
        data: { nudgeCount: { increment: 1 } },
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      return NextResponse.json({ id });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    logger.error({ err, route: "PATCH /api/focus-session/[id]" }, "Failed to update focus session");
    return NextResponse.json(
      { error: "Failed to update focus session." },
      { status: 500 }
    );
  }
}
