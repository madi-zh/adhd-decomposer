import { NextResponse } from "next/server";

import { findOwnedTask, requireSession } from "@/lib/api-helpers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [auth, { id }, body] = await Promise.all([
      requireSession(),
      params,
      request.json(),
    ]);
    if (auth.error) return auth.error;

    const task = await findOwnedTask(id, auth.userId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const deadline = new Date(body.deadline);

    if (isNaN(deadline.getTime()) || deadline <= new Date()) {
      return NextResponse.json(
        { error: "Deadline must be a valid future date." },
        { status: 400 }
      );
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { deadline },
    });

    return NextResponse.json({ id: updated.id, deadline: updated.deadline });
  } catch (err) {
    logger.error({ err, route: "PATCH /api/tasks/[id]/deadline" }, "Failed to set deadline");
    return NextResponse.json(
      { error: "Failed to set deadline." },
      { status: 500 }
    );
  }
}
