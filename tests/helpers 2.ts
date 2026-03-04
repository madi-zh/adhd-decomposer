import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { execSync } from "child_process";
import path from "path";

let testPrisma: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    const dbPath = path.join(__dirname, `test-${process.pid}.db`);
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    testPrisma = new PrismaClient({ adapter });

    // Push schema to test DB
    execSync(`npx prisma db push --skip-generate`, {
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      stdio: "ignore",
    });
  }
  return testPrisma;
}

export async function cleanupTestDb() {
  const prisma = getTestPrisma();
  // Delete in order respecting foreign keys
  await prisma.moodCheckIn.deleteMany();
  await prisma.focusRoomPresence.deleteMany();
  await prisma.timeEstimate.deleteMany();
  await prisma.step.deleteMany();
  await prisma.task.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
}

export async function disconnectTestDb() {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
  // Clean up test DB file
  const dbPath = path.join(__dirname, `test-${process.pid}.db`);
  try {
    const fs = await import("fs");
    fs.unlinkSync(dbPath);
  } catch {
    // Ignore if already deleted
  }
}

export async function createTestUser(prisma: PrismaClient, overrides?: Partial<{ email: string; name: string; hashedPassword: string }>) {
  const bcrypt = await import("bcryptjs");
  return prisma.user.create({
    data: {
      email: overrides?.email ?? "test@example.com",
      name: overrides?.name ?? "Test User",
      hashedPassword: overrides?.hashedPassword ?? await bcrypt.hash("Password123!", 4),
    },
  });
}

export async function createTestTask(prisma: PrismaClient, userId: string, overrides?: Partial<{ title: string; rawInput: string; status: string }>) {
  return prisma.task.create({
    data: {
      title: overrides?.title ?? "Test Task",
      rawInput: overrides?.rawInput ?? "Test input",
      status: overrides?.status ?? "active",
      userId,
      steps: {
        create: [
          { orderIndex: 0, content: "Step 1" },
          { orderIndex: 1, content: "Step 2" },
          { orderIndex: 2, content: "Step 3" },
        ],
      },
    },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });
}

export function mockRequest(method: string, body?: unknown, url = "http://localhost:3000"): Request {
  const init: RequestInit = { method };
  if (body) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

export function mockParams(params: Record<string, string>): Promise<Record<string, string>> {
  return Promise.resolve(params);
}
