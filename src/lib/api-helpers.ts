import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AuthResult =
  | { userId: string; error?: never }
  | { userId?: never; error: NextResponse };

export async function requireSession(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId: session.user.id };
}

export async function findOwnedTask(taskId: string, userId: string) {
  return prisma.task.findUnique({
    where: { id: taskId, userId },
  });
}

export async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  return body as Record<string, unknown>;
}
