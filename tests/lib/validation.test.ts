import { describe, it, expect } from "vitest";
import { MIN_PASSWORD_LENGTH, MIN_ESTIMATE_MINUTES, MAX_ESTIMATE_MINUTES } from "@/lib/validation";

describe("validation constants", () => {
  it("exports password length minimum", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
  });

  it("exports estimate minute bounds", () => {
    expect(MIN_ESTIMATE_MINUTES).toBe(1);
    expect(MAX_ESTIMATE_MINUTES).toBe(480);
  });
});
