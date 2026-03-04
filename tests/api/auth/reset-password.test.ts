import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { POST } from "@/app/api/auth/reset-password/route";

// Mock prisma
vi.mock("@/lib/prisma", () => {
  // We need a transaction mock that executes the callback with a tx object
  const tx = {
    verificationToken: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  };

  return {
    prisma: {
      $transaction: vi.fn((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx)),
      _tx: tx, // exposed so tests can configure individual tx methods
    },
  };
});

// Mock bcryptjs so tests run fast
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("new_hashed_password"),
  },
}));

import { prisma } from "@/lib/prisma";

// Access the inner tx object via the private _tx property we exposed
const tx = (prisma as unknown as { _tx: { verificationToken: { findFirst: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> }; user: { update: ReturnType<typeof vi.fn> } } })._tx;

const mockFindFirst = vi.mocked(tx.verificationToken.findFirst);
const mockTxDelete = vi.mocked(tx.verificationToken.delete);
const mockUserUpdate = vi.mocked(tx.user.update);

/** Build a raw token + its SHA-256 hash pair for test use. */
function buildToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hashed = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hashed };
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_EMAIL = "alice@example.com";
const VALID_PASSWORD = "NewPassword123!";

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTxDelete.mockResolvedValue({
      identifier: VALID_EMAIL,
      token: "hashed",
      expires: new Date(),
    });
    mockUserUpdate.mockResolvedValue({
      id: "user-1",
      email: VALID_EMAIL,
      name: "Alice",
      hashedPassword: "new_hashed_password",
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe("successful password reset", () => {
    it("returns 200 with success:true when token and password are valid", async () => {
      const { raw, hashed } = buildToken();
      mockFindFirst.mockResolvedValueOnce({
        identifier: VALID_EMAIL,
        token: hashed,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour in the future
      });

      const response = await POST(makeRequest({ email: VALID_EMAIL, token: raw, password: VALID_PASSWORD }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true });
    });

    it("looks up the token using a SHA-256 hash of the raw token", async () => {
      const { raw, hashed } = buildToken();
      mockFindFirst.mockResolvedValueOnce({
        identifier: VALID_EMAIL,
        token: hashed,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      });

      await POST(makeRequest({ email: VALID_EMAIL, token: raw, password: VALID_PASSWORD }));

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ token: hashed }),
        })
      );
    });

    it("deletes the verification token after a successful reset", async () => {
      const { raw, hashed } = buildToken();
      mockFindFirst.mockResolvedValueOnce({
        identifier: VALID_EMAIL,
        token: hashed,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      });

      await POST(makeRequest({ email: VALID_EMAIL, token: raw, password: VALID_PASSWORD }));

      expect(mockTxDelete).toHaveBeenCalledOnce();
    });

    it("updates the user's hashedPassword with the bcrypt hash", async () => {
      const { raw, hashed } = buildToken();
      mockFindFirst.mockResolvedValueOnce({
        identifier: VALID_EMAIL,
        token: hashed,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      });

      await POST(makeRequest({ email: VALID_EMAIL, token: raw, password: VALID_PASSWORD }));

      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: VALID_EMAIL },
          data: { hashedPassword: "new_hashed_password" },
        })
      );
    });

    it("normalizes the email to lowercase before querying", async () => {
      const { raw, hashed } = buildToken();
      mockFindFirst.mockResolvedValueOnce({
        identifier: VALID_EMAIL,
        token: hashed,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      });

      await POST(makeRequest({ email: "ALICE@EXAMPLE.COM", token: raw, password: VALID_PASSWORD }));

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ identifier: VALID_EMAIL }),
        })
      );
    });
  });

  describe("invalid or expired token (400)", () => {
    it("returns 400 when no matching token is found", async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      const response = await POST(makeRequest({ email: VALID_EMAIL, token: "bad_token", password: VALID_PASSWORD }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toMatch(/invalid|expired/i);
    });

    it("does not update the user password when the token is not found", async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      await POST(makeRequest({ email: VALID_EMAIL, token: "bad_token", password: VALID_PASSWORD }));

      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("returns 400 when the token has expired", async () => {
      const { raw, hashed } = buildToken();
      mockFindFirst.mockResolvedValueOnce({
        identifier: VALID_EMAIL,
        token: hashed,
        expires: new Date(Date.now() - 1000), // 1 second in the past
      });

      const response = await POST(makeRequest({ email: VALID_EMAIL, token: raw, password: VALID_PASSWORD }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toMatch(/expired/i);
    });

    it("deletes the expired token to prevent future use attempts", async () => {
      const { raw, hashed } = buildToken();
      mockFindFirst.mockResolvedValueOnce({
        identifier: VALID_EMAIL,
        token: hashed,
        expires: new Date(Date.now() - 1000),
      });

      await POST(makeRequest({ email: VALID_EMAIL, token: raw, password: VALID_PASSWORD }));

      expect(mockTxDelete).toHaveBeenCalledOnce();
    });

    it("does not update the user password when the token has expired", async () => {
      const { raw, hashed } = buildToken();
      mockFindFirst.mockResolvedValueOnce({
        identifier: VALID_EMAIL,
        token: hashed,
        expires: new Date(Date.now() - 1000),
      });

      await POST(makeRequest({ email: VALID_EMAIL, token: raw, password: VALID_PASSWORD }));

      expect(mockUserUpdate).not.toHaveBeenCalled();
    });
  });

  describe("missing fields (400)", () => {
    it("returns 400 when email is missing", async () => {
      const response = await POST(makeRequest({ token: "tok", password: VALID_PASSWORD }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeTruthy();
    });

    it("returns 400 when token is missing", async () => {
      const response = await POST(makeRequest({ email: VALID_EMAIL, password: VALID_PASSWORD }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeTruthy();
    });

    it("returns 400 when password is missing", async () => {
      const response = await POST(makeRequest({ email: VALID_EMAIL, token: "tok" }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeTruthy();
    });

    it("returns 400 when all fields are missing", async () => {
      const response = await POST(makeRequest({}));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeTruthy();
    });

    it("returns 400 when password is shorter than 8 characters", async () => {
      const response = await POST(makeRequest({ email: VALID_EMAIL, token: "tok", password: "short" }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toMatch(/8 characters/i);
    });

    it("returns 400 when email is not a string", async () => {
      const response = await POST(makeRequest({ email: 42, token: "tok", password: VALID_PASSWORD }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeTruthy();
    });

    it("returns 400 when token is not a string", async () => {
      const response = await POST(makeRequest({ email: VALID_EMAIL, token: true, password: VALID_PASSWORD }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeTruthy();
    });
  });
});
