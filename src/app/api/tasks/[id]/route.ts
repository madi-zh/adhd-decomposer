import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [session, { id }] = await Promise.all([auth(), params]);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id, userId: session.user.id },
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
