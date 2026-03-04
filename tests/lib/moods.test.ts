import { describe, it, expect } from "vitest";
import {
  MOODS,
  MOOD_MAP,
  VALID_MOOD_KEYS,
  DISTRESSED_MOODS,
  type Mood,
  type DistressedMood,
} from "@/lib/moods";

describe("MOODS", () => {
  it("has exactly 5 entries", () => {
    expect(MOODS).toHaveLength(5);
  });

  it("contains entries with the correct keys", () => {
    const keys = MOODS.map((m) => m.key);
    expect(keys).toEqual(["calm", "excited", "anxious", "frustrated", "tired"]);
  });

  it("each entry has key, icon, color, and label fields", () => {
    for (const mood of MOODS) {
      expect(mood).toHaveProperty("key");
      expect(mood).toHaveProperty("icon");
      expect(mood).toHaveProperty("color");
      expect(mood).toHaveProperty("label");
      expect(typeof mood.key).toBe("string");
      expect(typeof mood.color).toBe("string");
      expect(typeof mood.label).toBe("string");
      // Lucide icons are React components; verify the field is present and non-null
      expect(mood.icon).toBeTruthy();
    }
  });

  it("has correct labels for each key", () => {
    const labelsByKey: Record<string, string> = {
      calm: "Calm",
      excited: "Excited",
      anxious: "Anxious",
      frustrated: "Frustrated",
      tired: "Tired",
    };
    for (const mood of MOODS) {
      expect(mood.label).toBe(labelsByKey[mood.key]);
    }
  });
});

describe("MOOD_MAP", () => {
  it("maps all 5 mood keys to their Mood objects", () => {
    expect(Object.keys(MOOD_MAP)).toHaveLength(5);
  });

  it("maps each key to the corresponding Mood entry", () => {
    for (const mood of MOODS) {
      expect(MOOD_MAP[mood.key]).toBe(mood);
    }
  });

  it("maps 'calm' to the calm mood", () => {
    expect(MOOD_MAP["calm"].label).toBe("Calm");
    expect(MOOD_MAP["calm"].color).toBe("text-sky-500");
  });

  it("maps 'frustrated' to the frustrated mood", () => {
    expect(MOOD_MAP["frustrated"].label).toBe("Frustrated");
    expect(MOOD_MAP["frustrated"].color).toBe("text-red-500");
  });
});

describe("VALID_MOOD_KEYS", () => {
  it("contains exactly the keys from MOODS", () => {
    expect(VALID_MOOD_KEYS).toEqual(MOODS.map((m) => m.key));
  });

  it("includes all expected mood keys", () => {
    expect(VALID_MOOD_KEYS).toContain("calm");
    expect(VALID_MOOD_KEYS).toContain("excited");
    expect(VALID_MOOD_KEYS).toContain("anxious");
    expect(VALID_MOOD_KEYS).toContain("frustrated");
    expect(VALID_MOOD_KEYS).toContain("tired");
  });

  it("has length matching MOODS", () => {
    expect(VALID_MOOD_KEYS).toHaveLength(MOODS.length);
  });
});

describe("DISTRESSED_MOODS", () => {
  it("contains exactly ['anxious', 'frustrated', 'tired']", () => {
    expect(DISTRESSED_MOODS).toEqual(["anxious", "frustrated", "tired"]);
  });

  it("has exactly 3 entries", () => {
    expect(DISTRESSED_MOODS).toHaveLength(3);
  });

  it("does not include calm or excited", () => {
    expect(DISTRESSED_MOODS).not.toContain("calm");
    expect(DISTRESSED_MOODS).not.toContain("excited");
  });
});

describe("DistressedMood type", () => {
  it("accepts valid distressed mood values at runtime", () => {
    // Type-level check: these assignments must compile without error
    const a: DistressedMood = "anxious";
    const b: DistressedMood = "frustrated";
    const c: DistressedMood = "tired";
    expect(["anxious", "frustrated", "tired"]).toContain(a);
    expect(["anxious", "frustrated", "tired"]).toContain(b);
    expect(["anxious", "frustrated", "tired"]).toContain(c);
  });

  it("distressed mood keys are a subset of all mood keys", () => {
    for (const key of DISTRESSED_MOODS) {
      expect(VALID_MOOD_KEYS).toContain(key);
    }
  });
});
