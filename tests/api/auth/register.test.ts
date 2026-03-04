import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/register/route";

// Mock prisma before importing the route so the route picks up the mock
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock bcryptjs so tests run fast without real hashing
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
  },
}));

import { prisma } from "@/lib/prisma";

const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockCreate = vi.mocked(prisma.user.create);

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful registration", () => {
    it("returns 201 with success:true when given valid credentials", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce({
        id: "user-1",
        email: "alice@example.com",
        name: "Alice",
        hashedPassword: "hashed_password",
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await POST(makeRequest({ name: "Alice", email: "alice@example.com", password: "Password123!" }));
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toEqual({ success: true });
    });

    it("normalizes the email to lowercase before storing", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce({
        id: "user-2",
        email: "alice@example.com",
        name: null,
        hashedPassword: "hashed_password",
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await POST(makeRequest({ email: "ALICE@EXAMPLE.COM", password: "Password123!" }));

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: "alice@example.com" },
      });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: "alice@example.com" }) })
      );
    });

    it("stores null name when name is omitted", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce({
        id: "user-3",
        email: "bob@example.com",
        name: null,
        hashedPassword: "hashed_password",
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await POST(makeRequest({ email: "bob@example.com", password: "Password123!" }));

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: null }) })
      );
    });
  });

  describe("duplicate email (409)", () => {
    it("returns 409 when the email is already registered", async () => {
      mockFindUnique.mockResolvedValueOnce({
        id: "existing-user",
        email: "taken@example.com",
        name: "Existing",
        hashedPassword: "hash",
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await POST(makeRequest({ email: "taken@example.com", password: "Password123!" }));
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error).toMatch(/already exists/i);
    });

    it("does not call prisma.user.create when duplicate is detected", async () => {
      mockFindUnique.mockResolvedValueOnce({
        id: "existing-user",
        email: "taken@example.com",
        name: null,
        hashedPassword: "hash",
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await POST(makeRequest({ email: "taken@example.com", password: "Password123!" }));

      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("missing fields (400)", () => {
    it("returns 400 when email is missing", async () => {
      const response = await POST(makeRequest({ password: "Password123!" }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeTruthy();
    });

    it("returns 400 when password is missing", async () => {
      const response = await POST(makeRequest({ email: "user@example.com" }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeTruthy();
    });

    it("returns 400 when the request body is empty", async () => {
      const response = await POST(makeRequest({}));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeTruthy();
    });

    it("returns 400 when email does not contain @", async () => {
      const response = await POST(makeRequest({ email: "notanemail", password: "Password123!" }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toMatch(/valid email/i);
    });

    it("returns 400 when request body is malformed JSON", async () => {
      const request = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json{{{",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeTruthy();
    });
  });

  describe("password too short (400)", () => {
    it("returns 400 when password is fewer than 8 characters", async () => {
      const response = await POST(makeRequest({ email: "user@example.com", password: "short" }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toMatch(/8 characters/i);
    });

    it("returns 400 when password is exactly 7 characters", async () => {
      const response = await POST(makeRequest({ email: "user@example.com", password: "1234567" }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toMatch(/8 characters/i);
    });

    it("accepts a password that is exactly 8 characters", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce({
        id: "user-4",
        email: "user@example.com",
        name: null,
        hashedPassword: "hashed_password",
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await POST(makeRequest({ email: "user@example.com", password: "12345678" }));

      expect(response.status).toBe(201);
    });
  });
});
