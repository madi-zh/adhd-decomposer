import { describe, it, expect } from "vitest";
import { isPresenceActive, seedToColor } from "@/lib/focus-room";

describe("isPresenceActive", () => {
  it("returns true for a timestamp from 1 minute ago", () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    expect(isPresenceActive(oneMinuteAgo)).toBe(true);
  });

  it("returns true for a timestamp from just now", () => {
    const justNow = new Date();
    expect(isPresenceActive(justNow)).toBe(true);
  });

  it("returns true for a timestamp within the 2-minute window", () => {
    const oneNinetySecondsAgo = new Date(Date.now() - 119 * 1000);
    expect(isPresenceActive(oneNinetySecondsAgo)).toBe(true);
  });

  it("returns false for a timestamp from exactly 2 minutes ago", () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    expect(isPresenceActive(twoMinutesAgo)).toBe(false);
  });

  it("returns false for a timestamp from 5 minutes ago", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(isPresenceActive(fiveMinutesAgo)).toBe(false);
  });

  it("returns false for a timestamp from 1 hour ago", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    expect(isPresenceActive(oneHourAgo)).toBe(false);
  });
});

describe("seedToColor", () => {
  it("returns a valid hex color string", () => {
    const color = seedToColor("test-seed");
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns the same color for the same seed (deterministic)", () => {
    const seed = "user-abc-123";
    const first = seedToColor(seed);
    const second = seedToColor(seed);
    expect(first).toBe(second);
  });

  it("returns the same color across multiple calls with the same seed", () => {
    const seed = "consistent-seed";
    const results = Array.from({ length: 5 }, () => seedToColor(seed));
    const unique = new Set(results);
    expect(unique.size).toBe(1);
  });

  it("returns different colors for different seeds", () => {
    const color1 = seedToColor("seed-one");
    const color2 = seedToColor("seed-two");
    expect(color1).not.toBe(color2);
  });

  it("returns different colors for similar but distinct seeds", () => {
    const color1 = seedToColor("userA");
    const color2 = seedToColor("userB");
    expect(color1).not.toBe(color2);
  });

  it("handles an empty string seed without throwing", () => {
    expect(() => seedToColor("")).not.toThrow();
    expect(seedToColor("")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("handles a long seed string", () => {
    const longSeed = "a".repeat(200);
    expect(seedToColor(longSeed)).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
