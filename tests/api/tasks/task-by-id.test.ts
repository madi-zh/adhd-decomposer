import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/tasks/[id]/route";
import { requireSession } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { mockRequest, mockParams } from "../../helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
    },
  },
}));

const mockRequireSession = vi.mocked(requireSession);
const mockTaskFindUnique = vi.mocked(prisma.task.findUnique);

const TASK_WITH_STEPS = {
  id: "task-abc",
  title: "Clean the kitchen",
  rawInput: "clean the kitchen",
  status: "active",
  userId: "user-123",
  createdAt: new Date("2026-03-04T10:00:00Z"),
  completedAt: null,
  steps: [
    { id: "step-1", content: "Walk to kitchen", orderIndex: 0, completed: false, taskId: "task-abc" },
    { id: "step-2", content: "Fill the sink with water", orderIndex: 1, completed: false, taskId: "task-abc" },
    { id: "step-3", content: "Wash the dishes", orderIndex: 2, completed: false, taskId: "task-abc" },
  ],
};

describe("GET /api/tasks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the task with its steps when authenticated and owned by user", async () => {
    mockRequireSession.mockResolvedValue({ userId: "user-123" });
    mockTaskFindUnique.mockResolvedValue(TASK_WITH_STEPS as never);

    const response = await GET(mockRequest("GET"), {
      params: mockParams({ id: "task-abc" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("task-abc");
    expect(body.title).toBe("Clean the kitchen");
    expect(body.steps).toHaveLength(3);
    expect(body.steps[0].content).toBe("Walk to kitchen");
    expect(body.steps[2].content).toBe("Wash the dishes");

    expect(mockTaskFindUnique).toHaveBeenCalledOnce();
    const findCall = mockTaskFindUnique.mock.calls[0][0];
    expect(findCall?.where).toEqual({ id: "task-abc", userId: "user-123" });
    expect(findCall?.include?.steps).toBeDefined();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireSession.mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }) as never,
    });

    const response = await GET(mockRequest("GET"), {
      params: mockParams({ id: "task-abc" }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockTaskFindUnique).not.toHaveBeenCalled();
  });

  it("returns 404 for a non-existent task", async () => {
    mockRequireSession.mockResolvedValue({ userId: "user-123" });
    mockTaskFindUnique.mockResolvedValue(null);

    const response = await GET(mockRequest("GET"), {
      params: mockParams({ id: "nonexistent-task-id" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Task not found");

    expect(mockTaskFindUnique).toHaveBeenCalledOnce();
    const findCall = mockTaskFindUnique.mock.calls[0][0];
    expect(findCall?.where).toEqual({ id: "nonexistent-task-id", userId: "user-123" });
  });

  it("returns 404 when accessing another user's task", async () => {
    // The route queries by both id AND userId, so Prisma returns null for cross-user access
    mockRequireSession.mockResolvedValue({ userId: "other-user-456" });
    mockTaskFindUnique.mockResolvedValue(null);

    const response = await GET(mockRequest("GET"), {
      params: mockParams({ id: "task-abc" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Task not found");

    expect(mockTaskFindUnique).toHaveBeenCalledOnce();
    const findCall = mockTaskFindUnique.mock.calls[0][0];
    // Confirm the query used the requesting user's id, not the task owner's
    expect(findCall?.where).toEqual({ id: "task-abc", userId: "other-user-456" });
  });

  it("returns 500 when prisma throws an error", async () => {
    mockRequireSession.mockResolvedValue({ userId: "user-123" });
    mockTaskFindUnique.mockRejectedValue(new Error("DB connection error"));

    const response = await GET(mockRequest("GET"), {
      params: mockParams({ id: "task-abc" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to load task.");
  });
});
