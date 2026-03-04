import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/tasks/[id]/estimate/route";
import { requireSession, findOwnedTask } from "@/lib/api-helpers";
import { MIN_ESTIMATE_MINUTES, MAX_ESTIMATE_MINUTES } from "@/lib/validation";

// Mock prisma before importing the route so the route picks up the mock
vi.mock("@/lib/prisma", () => ({
  prisma: {
    timeEstimate: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockCreate = vi.mocked(prisma.timeEstimate.create);
const mockFindUnique = vi.mocked(prisma.timeEstimate.findUnique);
const mockRequireSession = vi.mocked(requireSession);
const mockFindOwnedTask = vi.mocked(findOwnedTask);

const TASK_ID = "task-id";
const USER_ID = "test-user-id";

function makePostRequest(body: unknown): Request {
  return new Request(`http://localhost/api/tasks/${TASK_ID}/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(): Request {
  return new Request(`http://localhost/api/tasks/${TASK_ID}/estimate`, {
    method: "GET",
  });
}

function makeParams(id = TASK_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

const mockTask = {
  id: TASK_ID,
  title: "Test Task",
  rawInput: "Test input",
  status: "active",
  userId: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const NOW = new Date("2026-03-04T12:00:00.000Z");

const mockTimeEstimate = {
  id: "estimate-1",
  taskId: TASK_ID,
  estimateMinutes: 30,
  startedAt: NOW,
  completedAt: null,
  actualMinutes: null,
  createdAt: NOW,
};

describe("POST /api/tasks/[id]/estimate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // setup.ts default: requireSession returns { userId: "test-user-id" }
    // findOwnedTask has no default — set per-test
  });

  describe("successful creation (200)", () => {
    it("creates a time estimate and returns it", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(mockTask);
      mockCreate.mockResolvedValueOnce(mockTimeEstimate);

      const response = await POST(makePostRequest({ estimateMinutes: 30 }), makeParams());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        id: "estimate-1",
        taskId: TASK_ID,
        estimateMinutes: 30,
        startedAt: NOW.toISOString(),
      });
    });

    it("calls prisma.timeEstimate.create with the correct taskId and estimateMinutes", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(mockTask);
      mockCreate.mockResolvedValueOnce({ ...mockTimeEstimate, estimateMinutes: 60 });

      await POST(makePostRequest({ estimateMinutes: 60 }), makeParams());

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskId: TASK_ID,
            estimateMinutes: 60,
          }),
        })
      );
    });

    it("accepts estimateMinutes equal to MIN_ESTIMATE_MINUTES", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(mockTask);
      mockCreate.mockResolvedValueOnce({ ...mockTimeEstimate, estimateMinutes: MIN_ESTIMATE_MINUTES });

      const response = await POST(makePostRequest({ estimateMinutes: MIN_ESTIMATE_MINUTES }), makeParams());

      expect(response.status).toBe(200);
    });

    it("accepts estimateMinutes equal to MAX_ESTIMATE_MINUTES", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(mockTask);
      mockCreate.mockResolvedValueOnce({ ...mockTimeEstimate, estimateMinutes: MAX_ESTIMATE_MINUTES });

      const response = await POST(makePostRequest({ estimateMinutes: MAX_ESTIMATE_MINUTES }), makeParams());

      expect(response.status).toBe(200);
    });
  });

  describe("authentication (401)", () => {
    it("returns 401 when requireSession returns an error", async () => {
      mockRequireSession.mockResolvedValueOnce({
        error: Response.json({ error: "Unauthorized" }, { status: 401 }) as never,
      });

      const response = await POST(makePostRequest({ estimateMinutes: 30 }), makeParams());

      expect(response.status).toBe(401);
    });

    it("does not call findOwnedTask when the session is invalid", async () => {
      mockRequireSession.mockResolvedValueOnce({
        error: Response.json({ error: "Unauthorized" }, { status: 401 }) as never,
      });

      await POST(makePostRequest({ estimateMinutes: 30 }), makeParams());

      expect(mockFindOwnedTask).not.toHaveBeenCalled();
    });
  });

  describe("task not found (404)", () => {
    it("returns 404 when findOwnedTask returns null", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(null);

      const response = await POST(makePostRequest({ estimateMinutes: 30 }), makeParams());
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toMatch(/not found/i);
    });

    it("does not call prisma.timeEstimate.create when the task is not found", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(null);

      await POST(makePostRequest({ estimateMinutes: 30 }), makeParams());

      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("invalid estimateMinutes (400)", () => {
    it("returns 400 when estimateMinutes is a float", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(mockTask);

      const response = await POST(makePostRequest({ estimateMinutes: 1.5 }), makeParams());
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toMatch(/integer/i);
    });

    it("returns 400 when estimateMinutes is a string", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(mockTask);

      const response = await POST(makePostRequest({ estimateMinutes: "30" }), makeParams());
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toMatch(/integer/i);
    });

    it("returns 400 when estimateMinutes is missing from the body", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(mockTask);

      const response = await POST(makePostRequest({}), makeParams());
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toMatch(/integer/i);
    });

    it("returns 400 when estimateMinutes is below the minimum (< 1)", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(mockTask);

      const response = await POST(makePostRequest({ estimateMinutes: MIN_ESTIMATE_MINUTES - 1 }), makeParams());
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain(String(MIN_ESTIMATE_MINUTES));
    });

    it("returns 400 when estimateMinutes is 0", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(mockTask);

      const response = await POST(makePostRequest({ estimateMinutes: 0 }), makeParams());

      expect(response.status).toBe(400);
    });

    it("returns 400 when estimateMinutes exceeds the maximum (> 480)", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(mockTask);

      const response = await POST(makePostRequest({ estimateMinutes: MAX_ESTIMATE_MINUTES + 1 }), makeParams());
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain(String(MAX_ESTIMATE_MINUTES));
    });

    it("returns 400 when estimateMinutes is negative", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(mockTask);

      const response = await POST(makePostRequest({ estimateMinutes: -10 }), makeParams());

      expect(response.status).toBe(400);
    });

    it("includes both MIN and MAX values in the error message", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(mockTask);

      const response = await POST(makePostRequest({ estimateMinutes: 9999 }), makeParams());
      const body = await response.json();

      expect(body.error).toContain(String(MIN_ESTIMATE_MINUTES));
      expect(body.error).toContain(String(MAX_ESTIMATE_MINUTES));
    });
  });
});

describe("GET /api/tasks/[id]/estimate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("returns existing time estimate (200)", () => {
    it("returns the estimate when task and estimate both exist", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(mockTask);
      mockFindUnique.mockResolvedValueOnce(mockTimeEstimate);

      const response = await GET(makeGetRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        id: "estimate-1",
        estimateMinutes: 30,
        startedAt: NOW.toISOString(),
        completedAt: null,
        actualMinutes: null,
      });
    });

    it("includes completedAt and actualMinutes when the estimate is completed", async () => {
      const completedAt = new Date("2026-03-04T12:45:00.000Z");
      const completedEstimate = {
        ...mockTimeEstimate,
        completedAt,
        actualMinutes: 45,
      };
      mockFindOwnedTask.mockResolvedValueOnce(mockTask);
      mockFindUnique.mockResolvedValueOnce(completedEstimate);

      const response = await GET(makeGetRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.completedAt).toBe(completedAt.toISOString());
      expect(body.actualMinutes).toBe(45);
    });

    it("queries prisma.timeEstimate.findUnique with the correct taskId", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(mockTask);
      mockFindUnique.mockResolvedValueOnce(mockTimeEstimate);

      await GET(makeGetRequest(), makeParams());

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { taskId: TASK_ID },
      });
    });
  });

  describe("authentication (401)", () => {
    it("returns 401 when requireSession returns an error", async () => {
      mockRequireSession.mockResolvedValueOnce({
        error: Response.json({ error: "Unauthorized" }, { status: 401 }) as never,
      });

      const response = await GET(makeGetRequest(), makeParams());

      expect(response.status).toBe(401);
    });

    it("does not call findOwnedTask when the session is invalid", async () => {
      mockRequireSession.mockResolvedValueOnce({
        error: Response.json({ error: "Unauthorized" }, { status: 401 }) as never,
      });

      await GET(makeGetRequest(), makeParams());

      expect(mockFindOwnedTask).not.toHaveBeenCalled();
    });
  });

  describe("task not found (404)", () => {
    it("returns 404 when findOwnedTask returns null", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(null);

      const response = await GET(makeGetRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toMatch(/not found/i);
    });

    it("does not call prisma.timeEstimate.findUnique when the task is not found", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(null);

      await GET(makeGetRequest(), makeParams());

      expect(mockFindUnique).not.toHaveBeenCalled();
    });
  });

  describe("estimate not found (404)", () => {
    it("returns 404 when no estimate exists for the task", async () => {
      mockFindOwnedTask.mockResolvedValueOnce(mockTask);
      mockFindUnique.mockResolvedValueOnce(null);

      const response = await GET(makeGetRequest(), makeParams());
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toMatch(/no estimate/i);
    });
  });
});
