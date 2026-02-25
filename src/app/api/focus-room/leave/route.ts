import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(request: Request) {
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
  } catch {
    return NextResponse.json(
      { error: "Failed to leave focus room." },
      { status: 500 }
    );
  }
}
