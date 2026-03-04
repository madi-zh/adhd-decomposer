import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/focus-room/count/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    focusRoomPresence: {
      count: vi.fn(),
    },
  },
}));

const mockCount = vi.mocked(prisma.focusRoomPresence.count);

const USER_ID = "test-user-id";

describe("GET /api/focus-room/count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("returns active focus count", () => {
    it("returns activeCount with the number of active presences", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockCount.mockResolvedValue(7);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ activeCount: 7 });
    });

    it("returns activeCount of 0 when no users are active", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockCount.mockResolvedValue(0);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ activeCount: 0 });
    });

    it("queries count using a 2-minute activity window", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockCount.mockResolvedValue(4);

      await GET();

      expect(mockCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lastPingAt: expect.objectContaining({ gt: expect.any(Date) }),
          }),
        })
      );
    });

    it("calls prisma.focusRoomPresence.count exactly once", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as Awaited<ReturnType<typeof auth>>);
      mockCount.mockResolvedValue(2);

      await GET();

      expect(mockCount).toHaveBeenCalledTimes(1);
    });
  });

  describe("returns 401 when not authenticated", () => {
    it("returns 401 with Unauthorized error when session is null", async () => {
      // auth() returns null by default from setup.ts

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({ error: "Unauthorized" });
    });

    it("does not call prisma when unauthenticated", async () => {
      // auth() returns null by default from setup.ts

      await GET();

      expect(mockCount).not.toHaveBeenCalled();
    });
  });
});
