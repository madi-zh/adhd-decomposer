import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "@/app/api/mood/route";
import { requireSession, findOwnedTask } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { mockRequest } from "../helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    moodCheckIn: {
      upsert: vi.fn(),
    },
  },
}));

const mockRequireSession = vi.mocked(requireSession);
const mockFindOwnedTask = vi.mocked(findOwnedTask);
const mockUpsert = vi.mocked(prisma.moodCheckIn.upsert);

const TASK_ID = "task-abc-123";
const USER_ID = "test-user-id";

const mockTask = {
  id: TASK_ID,
  userId: USER_ID,
  title: "Test Task",
  rawInput: "Test input",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCheckIn = {
  id: "checkin-1",
  taskId: TASK_ID,
  userId: USER_ID,
  mood: "calm",
  timing: "before",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ userId: USER_ID });
  mockFindOwnedTask.mockResolvedValue(mockTask);
});

describe("POST /api/mood", () => {
  it("saves a mood check-in successfully (before timing)", async () => {
    const checkIn = { ...mockCheckIn, mood: "calm", timing: "before" };
    mockUpsert.mockResolvedValue(checkIn as never);

    const req = mockRequest("POST", { taskId: TASK_ID, mood: "calm", timing: "before" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      id: checkIn.id,
      mood: "calm",
      timing: "before",
    });
    expect(mockUpsert).toHaveBeenCalledWith({
      where: {
        taskId_userId_timing: { taskId: TASK_ID, userId: USER_ID, timing: "before" },
      },
      update: { mood: "calm" },
      create: {
        taskId: TASK_ID,
        userId: USER_ID,
        mood: "calm",
        timing: "before",
      },
    });
  });

  it("saves a mood check-in successfully (after timing)", async () => {
    const checkIn = { ...mockCheckIn, mood: "excited", timing: "after" };
    mockUpsert.mockResolvedValue(checkIn as never);

    const req = mockRequest("POST", { taskId: TASK_ID, mood: "excited", timing: "after" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      id: checkIn.id,
      mood: "excited",
      timing: "after",
    });
    expect(mockUpsert).toHaveBeenCalledWith({
      where: {
        taskId_userId_timing: { taskId: TASK_ID, userId: USER_ID, timing: "after" },
      },
      update: { mood: "excited" },
      create: {
        taskId: TASK_ID,
        userId: USER_ID,
        mood: "excited",
        timing: "after",
      },
    });
  });

  it("upserts when check-in already exists", async () => {
    const updated = { ...mockCheckIn, mood: "frustrated", timing: "before" };
    mockUpsert.mockResolvedValue(updated as never);

    const req = mockRequest("POST", { taskId: TASK_ID, mood: "frustrated", timing: "before" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.mood).toBe("frustrated");
    expect(json.timing).toBe("before");
    // upsert is called with update payload — verifies upsert semantics are used
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { mood: "frustrated" },
        create: expect.objectContaining({ mood: "frustrated", timing: "before" }),
      })
    );
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireSession.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = mockRequest("POST", { taskId: TASK_ID, mood: "calm", timing: "before" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ error: "Unauthorized" });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid request body (not an object)", async () => {
    // Provide a raw string body that cannot be parsed as an object by the route
    const req = new Request("http://localhost:3000/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '"just a string"',
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "Invalid request body." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 for missing taskId", async () => {
    const req = mockRequest("POST", { mood: "calm", timing: "before" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "Task ID is required." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid mood value (not in VALID_MOOD_KEYS)", async () => {
    const req = mockRequest("POST", { taskId: TASK_ID, mood: "ecstatic", timing: "before" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "Invalid mood value." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid timing value", async () => {
    const req = mockRequest("POST", { taskId: TASK_ID, mood: "calm", timing: "during" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "Invalid timing value." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns 404 when task doesn't exist (ownership check)", async () => {
    mockFindOwnedTask.mockResolvedValue(null);

    const req = mockRequest("POST", { taskId: "nonexistent-task", mood: "calm", timing: "before" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json).toEqual({ error: "Task not found." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
