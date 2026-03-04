import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";

const SETTINGS_SELECT = {
  eveningCutoffHour: true,
  eveningCutoffMin: true,
  enableEveningMode: true,
  enableFocusTimer: true,
} as const;

export async function GET() {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    const settings = await prisma.userSettings.findUnique({
      where: { userId: auth.userId },
      select: SETTINGS_SELECT,
    });

    return NextResponse.json(settings ?? {
      eveningCutoffHour: 23,
      eveningCutoffMin: 0,
      enableEveningMode: false,
      enableFocusTimer: true,
    });
  } catch (err) {
    logger.error({ err, route: "GET /api/user/settings" }, "Failed to fetch settings");
    return NextResponse.json(
      { error: "Failed to fetch settings." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const [auth, body] = await Promise.all([
      requireSession(),
      request.json().catch(() => null),
    ]);
    if (auth.error) return auth.error;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
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

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields provided." }, { status: 400 });
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: auth.userId },
      update: data,
      create: { userId: auth.userId, ...data },
      select: SETTINGS_SELECT,
    });

    return NextResponse.json(settings);
  } catch (err) {
    logger.error({ err, route: "PATCH /api/user/settings" }, "Failed to update settings");
    return NextResponse.json(
      { error: "Failed to update settings." },
      { status: 500 }
    );
  }
}
