import { vi } from "vitest";

// Mock next-auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// Mock api-helpers (uses auth internally)
vi.mock("@/lib/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-helpers")>("@/lib/api-helpers");
  return {
    ...actual,
    requireSession: vi.fn().mockResolvedValue({ userId: "test-user-id" }),
    findOwnedTask: vi.fn(),
  };
});

// Mock logger to suppress output
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              title: "Test Task",
              steps: ["Step 1", "Step 2", "Step 3"],
            }),
          },
        ],
      }),
    };
  },
}));

// Mock Resend
vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = { send: vi.fn().mockResolvedValue({ id: "mock-email-id" }) };
  },
}));
