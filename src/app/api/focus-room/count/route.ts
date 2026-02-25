import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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
