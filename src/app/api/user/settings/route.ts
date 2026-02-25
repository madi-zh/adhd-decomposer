import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {},
      create: { userId: session.user.id },
      select: {
        eveningCutoffHour: true,
        eveningCutoffMin: true,
        enableEveningMode: true,
        enableFocusTimer: true,
      },
    });

    return NextResponse.json(settings);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch settings." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const [session, body] = await Promise.all([auth(), request.json()]);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eveningCutoffHour, eveningCutoffMin, enableEveningMode, enableFocusTimer } = body;

    const data: Record<string, unknown> = {};
    if (typeof eveningCutoffHour === "number" && eveningCutoffHour >= 0 && eveningCutoffHour <= 23) {
      data.eveningCutoffHour = eveningCutoffHour;
    }
    if (typeof eveningCutoffMin === "number" && eveningCutoffMin >= 0 && eveningCutoffMin <= 59) {
      data.eveningCutoffMin = eveningCutoffMin;
    }
    if (typeof enableEveningMode === "boolean") {
      data.enableEveningMode = enableEveningMode;
    }
    if (typeof enableFocusTimer === "boolean") {
      data.enableFocusTimer = enableFocusTimer;
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: data,
      create: { userId: session.user.id, ...data },
      select: {
        eveningCutoffHour: true,
        eveningCutoffMin: true,
        enableEveningMode: true,
        enableFocusTimer: true,
      },
    });

    return NextResponse.json(settings);
  } catch {
    return NextResponse.json(
      { error: "Failed to update settings." },
      { status: 500 }
    );
  }
}
