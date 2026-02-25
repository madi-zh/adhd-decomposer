import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [session, { id }] = await Promise.all([auth(), params]);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();
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
  } catch {
    return NextResponse.json(
      { error: "Failed to set deadline." },
      { status: 500 }
    );
  }
}
