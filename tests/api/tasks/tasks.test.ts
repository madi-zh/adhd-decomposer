import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/tasks/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mockRequest } from "../../helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const mockAuth = vi.mocked(auth);
const mockTaskCreate = vi.mocked(prisma.task.create);
const mockTaskFindMany = vi.mocked(prisma.task.findMany);

const AUTHENTICATED_SESSION = {
  user: { id: "user-123", email: "test@example.com", name: "Test User" },
  expires: "2099-01-01",
};

const CREATED_TASK = {
  id: "task-abc",
  title: "Test Task",
  rawInput: "some task input",
  status: "active",
  userId: "user-123",
  createdAt: new Date("2026-03-04T10:00:00Z"),
  completedAt: null,
  steps: [
    { id: "step-1", content: "Step 1", orderIndex: 0, completed: false, taskId: "task-abc" },
    { id: "step-2", content: "Step 2", orderIndex: 1, completed: false, taskId: "task-abc" },
    { id: "step-3", content: "Step 3", orderIndex: 2, completed: false, taskId: "task-abc" },
  ],
};

describe("POST /api/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a task with Claude-decomposed steps when authenticated", async () => {
    mockAuth.mockResolvedValue(AUTHENTICATED_SESSION);
    mockTaskCreate.mockResolvedValue(CREATED_TASK as never);

    const request = mockRequest("POST", { input: "some task input" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("task-abc");
    expect(body.title).toBe("Test Task");
    expect(body.steps).toHaveLength(3);
    expect(body.steps[0].content).toBe("Step 1");

    expect(mockTaskCreate).toHaveBeenCalledOnce();
    const createCall = mockTaskCreate.mock.calls[0][0];
    expect(createCall.data.userId).toBe("user-123");
    expect(createCall.data.rawInput).toBe("some task input");
    expect(createCall.data.steps.create).toHaveLength(3);
    expect(createCall.include.steps).toBeDefined();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = mockRequest("POST", { input: "some task input" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockTaskCreate).not.toHaveBeenCalled();
  });

  it("returns 400 for empty input string", async () => {
    mockAuth.mockResolvedValue(AUTHENTICATED_SESSION);

    const request = mockRequest("POST", { input: "" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Please enter a task to break down.");
    expect(mockTaskCreate).not.toHaveBeenCalled();
  });

  it("returns 400 for whitespace-only input", async () => {
    mockAuth.mockResolvedValue(AUTHENTICATED_SESSION);

    const request = mockRequest("POST", { input: "   " });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Please enter a task to break down.");
    expect(mockTaskCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when input field is missing", async () => {
    mockAuth.mockResolvedValue(AUTHENTICATED_SESSION);

    const request = mockRequest("POST", {});
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Please enter a task to break down.");
    expect(mockTaskCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when body is invalid JSON", async () => {
    mockAuth.mockResolvedValue(AUTHENTICATED_SESSION);

    const request = new Request("http://localhost:3000/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-valid-json",
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid request body.");
    expect(mockTaskCreate).not.toHaveBeenCalled();
  });

  it("trims whitespace from input before processing", async () => {
    mockAuth.mockResolvedValue(AUTHENTICATED_SESSION);
    mockTaskCreate.mockResolvedValue(CREATED_TASK as never);

    const request = mockRequest("POST", { input: "  some task input  " });
    await POST(request);

    const createCall = mockTaskCreate.mock.calls[0][0];
    expect(createCall.data.rawInput).toBe("some task input");
  });
});

describe("GET /api/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the list of tasks for the authenticated user", async () => {
    mockAuth.mockResolvedValue(AUTHENTICATED_SESSION);

    const taskList = [
      {
        id: "task-1",
        title: "First Task",
        status: "active",
        completedAt: null,
        _count: { steps: 3 },
      },
      {
        id: "task-2",
        title: "Second Task",
        status: "completed",
        completedAt: new Date("2026-03-03T12:00:00Z"),
        _count: { steps: 5 },
      },
    ];
    mockTaskFindMany.mockResolvedValue(taskList as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(body[0].id).toBe("task-1");
    expect(body[0].title).toBe("First Task");
    expect(body[1].id).toBe("task-2");
    expect(body[1]._count.steps).toBe(5);

    expect(mockTaskFindMany).toHaveBeenCalledOnce();
    const findCall = mockTaskFindMany.mock.calls[0][0];
    expect(findCall?.where?.userId).toBe("user-123");
    expect(findCall?.orderBy).toEqual({ createdAt: "desc" });
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockTaskFindMany).not.toHaveBeenCalled();
  });

  it("returns an empty array for a user with no tasks", async () => {
    mockAuth.mockResolvedValue(AUTHENTICATED_SESSION);
    mockTaskFindMany.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
    expect(mockTaskFindMany).toHaveBeenCalledOnce();
  });

  it("returns 500 when prisma throws an error", async () => {
    mockAuth.mockResolvedValue(AUTHENTICATED_SESSION);
    mockTaskFindMany.mockRejectedValue(new Error("DB connection error"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to load tasks.");
  });
});
