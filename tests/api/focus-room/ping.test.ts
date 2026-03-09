import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/focus-room/ping/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    focusRoomPresence: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// next/server's after() runs callbacks after the response is sent; mock it to
// execute the callback immediately so we can assert on prisma.deleteMany calls.
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: vi.fn((fn: () => void) => fn()),
  };
});

const mockUpdateMany = vi.mocked(prisma.focusRoomPresence.updateMany);
const mockFindMany = vi.mocked(prisma.focusRoomPresence.findMany);
const mockDeleteMany = vi.mocked(prisma.focusRoomPresence.deleteMany);

const USER_ID = "test-user-id";
const PRESENCE_ID = "presence-abc-123";

const mockActiveUser = {
  avatarSeed: "other-user-seed",
  stepContent: "Working on step 2",
  joinedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
};

function makeRequest(body?: unknown): Request {
  return new Request("http://localhost/api/focus-room/ping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("POST /api/focus-room/ping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteMany.mockResolvedValue({ count: 0 });
  });

  describe("updates ping timestamp and cleans stale presences", () => {
    it("returns activeUsers list and totalActive count on success", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockFindMany.mockResolvedValue([mockActiveUser] as never);

      const res = await POST(makeRequest({ presenceId: PRESENCE_ID }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.activeUsers).toHaveLength(1);
      expect(json.totalActive).toBe(2); // 1 other + 1 caller
    });

    it("updates lastPingAt and stepContent for caller's presence", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockFindMany.mockResolvedValue([] as never);

      await POST(makeRequest({ presenceId: PRESENCE_ID, stepContent: "Working on step 1" }));

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: PRESENCE_ID, userId: USER_ID },
        data: {
          lastPingAt: expect.any(Date),
          stepContent: "Working on step 1",
        },
      });
    });

    it("truncates stepContent to 50 characters", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockFindMany.mockResolvedValue([] as never);

      const longContent = "a".repeat(100);
      await POST(makeRequest({ presenceId: PRESENCE_ID, stepContent: longContent }));

      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stepContent: "a".repeat(50),
          }),
        })
      );
    });

    it("sets stepContent to null when stepContent is omitted", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockFindMany.mockResolvedValue([] as never);

      await POST(makeRequest({ presenceId: PRESENCE_ID }));

      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stepContent: null }),
        })
      );
    });

    it("queries active users excluding the caller by userId", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockFindMany.mockResolvedValue([mockActiveUser] as never);

      await POST(makeRequest({ presenceId: PRESENCE_ID }));

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { not: USER_ID },
            lastPingAt: expect.objectContaining({ gt: expect.any(Date) }),
          }),
        })
      );
    });

    it("maps active users to avatarSeed, stepContent, and minutesFocusing", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockFindMany.mockResolvedValue([mockActiveUser] as never);

      const res = await POST(makeRequest({ presenceId: PRESENCE_ID }));
      const json = await res.json();

      expect(json.activeUsers[0]).toEqual({
        avatarSeed: "other-user-seed",
        stepContent: "Working on step 2",
        minutesFocusing: expect.any(Number),
      });
    });

    it("deletes stale presences older than 5 minutes via after()", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockFindMany.mockResolvedValue([] as never);
      mockDeleteMany.mockResolvedValue({ count: 2 });

      await POST(makeRequest({ presenceId: PRESENCE_ID }));

      expect(mockDeleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lastPingAt: expect.objectContaining({ lt: expect.any(Date) }),
          }),
        })
      );
    });

    it("returns totalActive of 1 when no other users are active", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockFindMany.mockResolvedValue([] as never);

      const res = await POST(makeRequest({ presenceId: PRESENCE_ID }));
      const json = await res.json();

      expect(json.totalActive).toBe(1);
      expect(json.activeUsers).toHaveLength(0);
    });
  });

  describe("returns 401 when not authenticated", () => {
    it("returns 401 with Unauthorized error when session is null", async () => {
      // auth() returns null by default from setup.ts

      const res = await POST(makeRequest({ presenceId: PRESENCE_ID }));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({ error: "Unauthorized" });
    });

    it("does not call prisma when unauthenticated", async () => {
      // auth() returns null by default from setup.ts

      await POST(makeRequest({ presenceId: PRESENCE_ID }));

      expect(mockUpdateMany).not.toHaveBeenCalled();
      expect(mockFindMany).not.toHaveBeenCalled();
    });
  });

  describe("returns 400 when presenceId is missing", () => {
    it("returns 400 with error message when presenceId is not provided", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);

      const res = await POST(makeRequest({}));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({ error: "presenceId is required" });
    });

    it("does not call updateMany when presenceId is missing", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);

      await POST(makeRequest({}));

      expect(mockUpdateMany).not.toHaveBeenCalled();
      expect(mockFindMany).not.toHaveBeenCalled();
    });
  });
});
