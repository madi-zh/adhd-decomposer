import { describe, it, expect, vi, beforeEach } from "vitest";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PATCH } from "@/app/api/steps/[id]/route";

// Mock next/server's after() — capture the callback promise so tests can
// await it before making assertions on side-effects.
let afterCallbacks: Promise<void>[] = [];
vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server");
  return { ...actual, after: vi.fn((cb: () => Promise<void>) => { afterCallbacks.push(cb()); }) };
});
async function flushAfterCallbacks() {
  await Promise.all(afterCallbacks);
  afterCallbacks = [];
}

// Mock prisma so we never touch a real database.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    step: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    task: {
      update: vi.fn(),
    },
    timeEstimate: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// ----- typed helpers -------------------------------------------------------

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockStepFindUnique = prisma.step.findUnique as ReturnType<typeof vi.fn>;
const mockStepUpdate = prisma.step.update as ReturnType<typeof vi.fn>;
const mockStepCount = prisma.step.count as ReturnType<typeof vi.fn>;
const mockTaskUpdate = prisma.task.update as ReturnType<typeof vi.fn>;
const mockTimeEstimateFindUnique = prisma.timeEstimate.findUnique as ReturnType<typeof vi.fn>;
const mockTimeEstimateUpdate = prisma.timeEstimate.update as ReturnType<typeof vi.fn>;

// ----- fixtures ------------------------------------------------------------

const AUTHENTICATED_SESSION = { user: { id: "user-1" } };

const buildStep = (overrides: Partial<{
  id: string;
  taskId: string;
  orderIndex: number;
  content: string;
  isCompleted: boolean;
  completedAt: Date | null;
  task: { userId: string };
}> = {}) => ({
  id: "step-1",
  taskId: "task-1",
  orderIndex: 0,
  content: "Do the thing",
  isCompleted: false,
  completedAt: null,
  task: { userId: "user-1" },
  ...overrides,
});

const buildUpdatedStep = (overrides: Partial<{
  id: string;
  taskId: string;
  isCompleted: boolean;
  completedAt: Date;
}> = {}) => ({
  id: "step-1",
  taskId: "task-1",
  isCompleted: true,
  completedAt: new Date("2026-03-04T10:00:00Z"),
  ...overrides,
});

function makeRequest(): Request {
  return new Request("http://localhost:3000/api/steps/step-1", {
    method: "PATCH",
  });
}

function makeParams(id = "step-1"): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

// ---------------------------------------------------------------------------

describe("PATCH /api/steps/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks = [];
    // Default: no active session (unauthenticated baseline).
    mockAuth.mockResolvedValue(null);
  });

  // -------------------------------------------------------------------------
  // 1. Happy path — mark step as completed (200)
  // -------------------------------------------------------------------------

  it("marks a step as completed and returns 200", async () => {
    mockAuth.mockResolvedValue(AUTHENTICATED_SESSION);
    mockStepFindUnique.mockResolvedValue(buildStep());
    const updatedStep = buildUpdatedStep();
    mockStepUpdate.mockResolvedValue(updatedStep);
    // No remaining steps — but we don't care about the completion branch here;
    // set count > 0 so the after() callback exits before touching task/estimate.
    mockStepCount.mockResolvedValue(1);

    const response = await PATCH(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    // NextResponse.json() serialises Date objects to ISO strings, so compare
    // using the serialised form rather than the original Date instance.
    expect(body).toEqual({
      step: {
        ...updatedStep,
        completedAt: updatedStep.completedAt.toISOString(),
      },
    });

    expect(mockStepFindUnique).toHaveBeenCalledWith({
      where: { id: "step-1" },
      include: { task: { select: { userId: true } } },
    });
    expect(mockStepUpdate).toHaveBeenCalledWith({
      where: { id: "step-1" },
      data: {
        isCompleted: true,
        completedAt: expect.any(Date),
      },
    });
  });

  // -------------------------------------------------------------------------
  // 2. Unauthenticated — 401
  // -------------------------------------------------------------------------

  it("returns 401 when the request is not authenticated", async () => {
    // auth() already returns null from beforeEach default.
    const response = await PATCH(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });

    // No DB access should have happened.
    expect(mockStepFindUnique).not.toHaveBeenCalled();
    expect(mockStepUpdate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 3. Non-existent step — 404
  // -------------------------------------------------------------------------

  it("returns 404 when the step does not exist", async () => {
    mockAuth.mockResolvedValue(AUTHENTICATED_SESSION);
    mockStepFindUnique.mockResolvedValue(null);

    const response = await PATCH(makeRequest(), makeParams("nonexistent-step"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Step not found" });
    expect(mockStepUpdate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 4. Step belongs to a different user's task — 404
  // -------------------------------------------------------------------------

  it("returns 404 when the step belongs to another user's task", async () => {
    mockAuth.mockResolvedValue(AUTHENTICATED_SESSION);
    // The step exists but its parent task belongs to a different user.
    mockStepFindUnique.mockResolvedValue(
      buildStep({ task: { userId: "other-user-99" } })
    );

    const response = await PATCH(makeRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Step not found" });
    expect(mockStepUpdate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 5. Last step completed — task status updated + TimeEstimate auto-updated
  // -------------------------------------------------------------------------

  it("updates task to completed and records actualMinutes when completing the last step", async () => {
    mockAuth.mockResolvedValue(AUTHENTICATED_SESSION);

    const startedAt = new Date("2026-03-04T09:00:00Z");
    const completedAt = new Date("2026-03-04T10:00:00Z");
    // 60 minutes elapsed.

    const updatedStep = buildUpdatedStep({ completedAt });
    mockStepFindUnique.mockResolvedValue(buildStep());
    mockStepUpdate.mockResolvedValue(updatedStep);
    // Zero remaining steps — this is the last one.
    mockStepCount.mockResolvedValue(0);

    const estimate = {
      id: "estimate-1",
      taskId: "task-1",
      startedAt,
      completedAt: null, // not yet finished
      actualMinutes: null,
    };
    // Promise.all([task.update, timeEstimate.findUnique]) is called in parallel.
    mockTaskUpdate.mockResolvedValue({});
    mockTimeEstimateFindUnique.mockResolvedValue(estimate);
    mockTimeEstimateUpdate.mockResolvedValue({});

    const response = await PATCH(makeRequest(), makeParams());
    await flushAfterCallbacks();

    expect(response.status).toBe(200);

    // Task must have been marked completed.
    expect(mockTaskUpdate).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data: {
        status: "completed",
        completedAt: expect.any(Date),
      },
    });

    // TimeEstimate must have been updated with actualMinutes.
    expect(mockTimeEstimateUpdate).toHaveBeenCalledWith({
      where: { id: "estimate-1" },
      data: {
        completedAt: expect.any(Date),
        actualMinutes: expect.any(Number),
      },
    });

    // Verify the computed duration is a positive integer.
    const updateCall = mockTimeEstimateUpdate.mock.calls[0][0];
    expect(updateCall.data.actualMinutes).toBeGreaterThan(0);
    expect(Number.isInteger(updateCall.data.actualMinutes)).toBe(true);
  });

  it("skips TimeEstimate update when the estimate is already marked completed", async () => {
    mockAuth.mockResolvedValue(AUTHENTICATED_SESSION);

    const startedAt = new Date("2026-03-04T09:00:00Z");
    const alreadyCompleted = new Date("2026-03-04T09:30:00Z");

    const updatedStep = buildUpdatedStep();
    mockStepFindUnique.mockResolvedValue(buildStep());
    mockStepUpdate.mockResolvedValue(updatedStep);
    mockStepCount.mockResolvedValue(0);

    mockTaskUpdate.mockResolvedValue({});
    // completedAt is already set — should NOT be updated again.
    mockTimeEstimateFindUnique.mockResolvedValue({
      id: "estimate-1",
      taskId: "task-1",
      startedAt,
      completedAt: alreadyCompleted,
      actualMinutes: 30,
    });

    await PATCH(makeRequest(), makeParams());
    await flushAfterCallbacks();

    expect(mockTaskUpdate).toHaveBeenCalled();
    expect(mockTimeEstimateUpdate).not.toHaveBeenCalled();
  });

  it("skips TimeEstimate update when no estimate record exists for the task", async () => {
    mockAuth.mockResolvedValue(AUTHENTICATED_SESSION);

    const updatedStep = buildUpdatedStep();
    mockStepFindUnique.mockResolvedValue(buildStep());
    mockStepUpdate.mockResolvedValue(updatedStep);
    mockStepCount.mockResolvedValue(0);

    mockTaskUpdate.mockResolvedValue({});
    mockTimeEstimateFindUnique.mockResolvedValue(null);

    await PATCH(makeRequest(), makeParams());
    await flushAfterCallbacks();

    expect(mockTaskUpdate).toHaveBeenCalled();
    expect(mockTimeEstimateUpdate).not.toHaveBeenCalled();
  });

  it("does not update task status when there are remaining incomplete steps", async () => {
    mockAuth.mockResolvedValue(AUTHENTICATED_SESSION);

    mockStepFindUnique.mockResolvedValue(buildStep());
    mockStepUpdate.mockResolvedValue(buildUpdatedStep());
    // Still 2 steps left — not the last step.
    mockStepCount.mockResolvedValue(2);

    const response = await PATCH(makeRequest(), makeParams());

    expect(response.status).toBe(200);
    expect(mockTaskUpdate).not.toHaveBeenCalled();
    expect(mockTimeEstimateUpdate).not.toHaveBeenCalled();
  });
});
