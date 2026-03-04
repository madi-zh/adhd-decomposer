import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { requireSession } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [auth, { id }] = await Promise.all([requireSession(), params]);
    if (auth.error) return auth.error;

    const task = await prisma.task.findUnique({
      where: { id, userId: auth.userId },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (err) {
    logger.error({ err, route: "GET /api/tasks/[id]" }, "Failed to load task");
    return NextResponse.json(
      { error: "Failed to load task." },
      { status: 500 }
    );
  }
}
