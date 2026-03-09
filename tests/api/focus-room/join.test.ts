import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/focus-room/join/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    focusRoomPresence: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/focus-room", () => ({
  generateAvatarSeed: vi.fn().mockReturnValue("mock-avatar-seed"),
}));

const mockDeleteMany = vi.mocked(prisma.focusRoomPresence.deleteMany);
const mockCreate = vi.mocked(prisma.focusRoomPresence.create);
const mockCount = vi.mocked(prisma.focusRoomPresence.count);

const USER_ID = "test-user-id";

const mockPresence = {
  id: "presence-1",
  userId: USER_ID,
  taskId: null,
  avatarSeed: "mock-avatar-seed",
  stepContent: null,
  joinedAt: new Date(),
  lastPingAt: new Date(),
};

function makeRequest(body?: unknown): Request {
  return new Request("http://localhost/api/focus-room/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("POST /api/focus-room/join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("joins focus room successfully", () => {
    it("returns presenceId, avatarSeed and activeCount on success", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockDeleteMany.mockResolvedValue({ count: 0 });
      mockCreate.mockResolvedValue(mockPresence as never);
      mockCount.mockResolvedValue(3);

      const res = await POST(makeRequest({}));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({
        presenceId: "presence-1",
        avatarSeed: "mock-avatar-seed",
        activeCount: 3,
      });
    });

    it("deletes stale presence for the user before creating a new one", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockDeleteMany.mockResolvedValue({ count: 1 });
      mockCreate.mockResolvedValue(mockPresence as never);
      mockCount.mockResolvedValue(1);

      await POST(makeRequest({}));

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      });
    });

    it("creates presence with taskId when taskId is provided in body", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockDeleteMany.mockResolvedValue({ count: 0 });
      mockCreate.mockResolvedValue({ ...mockPresence, taskId: "task-abc" } as never);
      mockCount.mockResolvedValue(2);

      await POST(makeRequest({ taskId: "task-abc" }));

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ taskId: "task-abc" }),
        })
      );
    });

    it("creates presence with null taskId when taskId is omitted", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockDeleteMany.mockResolvedValue({ count: 0 });
      mockCreate.mockResolvedValue(mockPresence as never);
      mockCount.mockResolvedValue(1);

      await POST(makeRequest({}));

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ taskId: null }),
        })
      );
    });

    it("queries active count using a 2-minute window", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockDeleteMany.mockResolvedValue({ count: 0 });
      mockCreate.mockResolvedValue(mockPresence as never);
      mockCount.mockResolvedValue(5);

      await POST(makeRequest({}));

      expect(mockCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lastPingAt: expect.objectContaining({ gt: expect.any(Date) }),
          }),
        })
      );
    });
  });

  describe("returns 401 when not authenticated", () => {
    it("returns 401 with Unauthorized error when session is null", async () => {
      // auth() returns null by default from setup.ts

      const res = await POST(makeRequest({}));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({ error: "Unauthorized" });
    });

    it("does not call prisma when unauthenticated", async () => {
      // auth() returns null by default from setup.ts

      await POST(makeRequest({}));

      expect(mockDeleteMany).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockCount).not.toHaveBeenCalled();
    });
  });
});
