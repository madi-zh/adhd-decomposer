import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [session, { id }, body] = await Promise.all([
      auth(),
      params,
      request.json(),
    ]);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const focusSession = await prisma.focusSession.findUnique({
      where: { id },
      select: { id: true, userId: true, nudgeCount: true },
    });

    if (!focusSession || focusSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { action } = body;

    if (action === "end") {
      const updated = await prisma.focusSession.update({
        where: { id },
        data: { endedAt: new Date() },
        select: { id: true, endedAt: true, nudgeCount: true },
      });
      return NextResponse.json(updated);
    }

    if (action === "nudge") {
      const updated = await prisma.focusSession.update({
        where: { id },
        data: { nudgeCount: { increment: 1 } },
        select: { id: true, nudgeCount: true },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Failed to update focus session." },
      { status: 500 }
    );
  }
}
