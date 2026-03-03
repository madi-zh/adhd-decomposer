import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeCount = await prisma.focusRoomPresence.count({
      where: {
        lastPingAt: { gt: new Date(Date.now() - 2 * 60 * 1000) },
      },
    });

    return NextResponse.json({ activeCount });
  } catch {
    return NextResponse.json(
      { error: "Failed to get focus room count." },
      { status: 500 }
    );
  }
}
