import { describe, it, expect, vi, beforeEach } from "vitest";

// The global setup.ts mocks @/lib/api-helpers with stubs. We need the real
// implementation here, so unmock it before any imports resolve.
vi.unmock("@/lib/api-helpers");

// Provide controlled mocks for the two dependencies used by api-helpers.
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
    },
  },
}));

import { requireSession, findOwnedTask } from "@/lib/api-helpers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockFindUnique = vi.mocked(prisma.task.findUnique);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireSession", () => {
  it("returns userId when auth() resolves a session with a user id", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "user-123" },
    } as Awaited<ReturnType<typeof auth>>);

    const result = await requireSession();

    expect(result).toEqual({ userId: "user-123" });
    expect("error" in result).toBe(false);
  });

  it("returns a 401 NextResponse when auth() returns null", async () => {
    mockAuth.mockResolvedValueOnce(null);

    const result = await requireSession();

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(401);
      const body = await result.error.json();
      expect(body).toEqual({ error: "Unauthorized" });
    }
  });

  it("returns a 401 NextResponse when session has no user id", async () => {
    mockAuth.mockResolvedValueOnce({
      user: {},
    } as Awaited<ReturnType<typeof auth>>);

    const result = await requireSession();

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(401);
    }
  });

  it("returns a 401 NextResponse when session has no user object", async () => {
    mockAuth.mockResolvedValueOnce({} as Awaited<ReturnType<typeof auth>>);

    const result = await requireSession();

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(401);
    }
  });

  it("calls auth() exactly once per invocation", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "user-456" },
    } as Awaited<ReturnType<typeof auth>>);

    await requireSession();

    expect(mockAuth).toHaveBeenCalledTimes(1);
  });
});

describe("findOwnedTask", () => {
  it("calls prisma.task.findUnique with the correct where clause", async () => {
    const fakeTask = { id: "task-abc", userId: "user-123", title: "My Task" };
    mockFindUnique.mockResolvedValueOnce(fakeTask as never);

    const result = await findOwnedTask("task-abc", "user-123");

    expect(mockFindUnique).toHaveBeenCalledTimes(1);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "task-abc", userId: "user-123" },
    });
    expect(result).toEqual(fakeTask);
  });

  it("returns null when prisma finds no matching task", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const result = await findOwnedTask("task-missing", "user-123");

    expect(result).toBeNull();
  });

  it("passes taskId and userId independently to the where clause", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await findOwnedTask("task-xyz", "user-789");

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "task-xyz", userId: "user-789" },
    });
  });
});
