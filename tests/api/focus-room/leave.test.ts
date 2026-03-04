import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, DELETE } from "@/app/api/focus-room/leave/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    focusRoomPresence: {
      deleteMany: vi.fn(),
    },
  },
}));

const mockDeleteMany = vi.mocked(prisma.focusRoomPresence.deleteMany);

const USER_ID = "test-user-id";
const PRESENCE_ID = "presence-abc-123";

function makeRequest(body?: unknown): Request {
  return new Request("http://localhost/api/focus-room/leave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("POST /api/focus-room/leave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("leaves focus room successfully", () => {
    it("returns success:true when presenceId is provided", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as any);
      mockDeleteMany.mockResolvedValue({ count: 1 });

      const res = await POST(makeRequest({ presenceId: PRESENCE_ID }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ success: true });
    });

    it("deletes the presence record scoped to userId and presenceId", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as any);
      mockDeleteMany.mockResolvedValue({ count: 1 });

      await POST(makeRequest({ presenceId: PRESENCE_ID }));

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { id: PRESENCE_ID, userId: USER_ID },
      });
    });

    it("returns success:true even when presenceId is omitted", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as any);

      const res = await POST(makeRequest({}));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ success: true });
    });

    it("does not call deleteMany when presenceId is omitted", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as any);

      await POST(makeRequest({}));

      expect(mockDeleteMany).not.toHaveBeenCalled();
    });
  });

  describe("returns 401 when not authenticated", () => {
    it("returns 401 with Unauthorized error when session is null (POST)", async () => {
      // auth() returns null by default from setup.ts

      const res = await POST(makeRequest({ presenceId: PRESENCE_ID }));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({ error: "Unauthorized" });
    });

    it("does not call prisma when unauthenticated (POST)", async () => {
      // auth() returns null by default from setup.ts

      await POST(makeRequest({ presenceId: PRESENCE_ID }));

      expect(mockDeleteMany).not.toHaveBeenCalled();
    });
  });
});

describe("DELETE /api/focus-room/leave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("leaves focus room successfully", () => {
    it("returns success:true when presenceId is provided via DELETE", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as any);
      mockDeleteMany.mockResolvedValue({ count: 1 });

      const res = await DELETE(makeRequest({ presenceId: PRESENCE_ID }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ success: true });
    });

    it("delegates to same handler as POST and calls deleteMany with correct args", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: USER_ID } } as any);
      mockDeleteMany.mockResolvedValue({ count: 1 });

      await DELETE(makeRequest({ presenceId: PRESENCE_ID }));

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { id: PRESENCE_ID, userId: USER_ID },
      });
    });
  });

  describe("returns 401 when not authenticated", () => {
    it("returns 401 with Unauthorized error when session is null (DELETE)", async () => {
      // auth() returns null by default from setup.ts

      const res = await DELETE(makeRequest({ presenceId: PRESENCE_ID }));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json).toEqual({ error: "Unauthorized" });
    });

    it("does not call prisma when unauthenticated (DELETE)", async () => {
      // auth() returns null by default from setup.ts

      await DELETE(makeRequest({ presenceId: PRESENCE_ID }));

      expect(mockDeleteMany).not.toHaveBeenCalled();
    });
  });
});
