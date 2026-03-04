import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/forgot-password/route";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    verificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock email module so no real emails are sent
vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock next/server's `after` to run the callback synchronously so tests can
// assert on side-effects without waiting for background tasks.
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: vi.fn((fn: () => Promise<void>) => fn()),
  };
});

import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockDeleteMany = vi.mocked(prisma.verificationToken.deleteMany);
const mockTokenCreate = vi.mocked(prisma.verificationToken.create);
const mockSendEmail = vi.mocked(sendPasswordResetEmail);

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const existingUser = {
  id: "user-1",
  email: "alice@example.com",
  name: "Alice",
  hashedPassword: "hash",
  emailVerified: null,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockTokenCreate.mockResolvedValue({
      identifier: "alice@example.com",
      token: "hashed_token",
      expires: new Date(Date.now() + 60 * 60 * 1000),
    });
  });

  describe("successful token creation", () => {
    it("returns 200 with success:true when the user exists", async () => {
      mockFindUnique.mockResolvedValueOnce(existingUser);

      const response = await POST(makeRequest({ email: "alice@example.com" }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true });
    });

    it("deletes any existing tokens before creating a new one", async () => {
      mockFindUnique.mockResolvedValueOnce(existingUser);

      await POST(makeRequest({ email: "alice@example.com" }));

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { identifier: "alice@example.com" },
      });
    });

    it("creates a new verification token with a 1-hour expiry", async () => {
      mockFindUnique.mockResolvedValueOnce(existingUser);
      const before = Date.now();

      await POST(makeRequest({ email: "alice@example.com" }));

      const after = Date.now();
      expect(mockTokenCreate).toHaveBeenCalledOnce();
      const callArg = mockTokenCreate.mock.calls[0][0];
      const expiresMs = callArg.data.expires.getTime();
      // Expiry should be roughly 1 hour from now
      expect(expiresMs).toBeGreaterThanOrEqual(before + 60 * 60 * 1000 - 100);
      expect(expiresMs).toBeLessThanOrEqual(after + 60 * 60 * 1000 + 100);
    });

    it("stores a SHA-256 hash of the token, not the raw token", async () => {
      mockFindUnique.mockResolvedValueOnce(existingUser);

      await POST(makeRequest({ email: "alice@example.com" }));

      const callArg = mockTokenCreate.mock.calls[0][0];
      const storedToken: string = callArg.data.token;
      // A hex-encoded SHA-256 digest is always 64 characters
      expect(storedToken).toHaveLength(64);
      // Must be all hex characters
      expect(storedToken).toMatch(/^[0-9a-f]{64}$/);
    });

    it("triggers a password-reset email after creating the token", async () => {
      mockFindUnique.mockResolvedValueOnce(existingUser);

      await POST(makeRequest({ email: "alice@example.com" }));

      expect(mockSendEmail).toHaveBeenCalledOnce();
      const [emailArg] = mockSendEmail.mock.calls[0];
      expect(emailArg).toBe("alice@example.com");
    });

    it("normalizes the email to lowercase before looking up the user", async () => {
      mockFindUnique.mockResolvedValueOnce(existingUser);

      await POST(makeRequest({ email: "ALICE@EXAMPLE.COM" }));

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: "alice@example.com" },
      });
    });
  });

  describe("non-existent email (still 200)", () => {
    it("returns 200 with success:true even when no user matches", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const response = await POST(makeRequest({ email: "nobody@example.com" }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true });
    });

    it("does not create a verification token when the email is not found", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      await POST(makeRequest({ email: "nobody@example.com" }));

      expect(mockTokenCreate).not.toHaveBeenCalled();
    });

    it("does not send an email when the user is not found", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      await POST(makeRequest({ email: "nobody@example.com" }));

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("response for missing user is indistinguishable from the success response", async () => {
      mockFindUnique.mockResolvedValueOnce(existingUser);
      const successResponse = await POST(makeRequest({ email: "alice@example.com" }));
      const successBody = await successResponse.json();

      mockFindUnique.mockResolvedValueOnce(null);
      const notFoundResponse = await POST(makeRequest({ email: "ghost@example.com" }));
      const notFoundBody = await notFoundResponse.json();

      expect(notFoundResponse.status).toBe(successResponse.status);
      expect(notFoundBody).toEqual(successBody);
    });
  });

  describe("invalid request (400)", () => {
    it("returns 400 when the email field is missing", async () => {
      const response = await POST(makeRequest({}));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeTruthy();
    });

    it("returns 400 when email is not a string", async () => {
      const response = await POST(makeRequest({ email: 12345 }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeTruthy();
    });
  });
});
