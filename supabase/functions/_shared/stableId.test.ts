import { describe, it, expect } from "vitest";
import { sha256Hex, stableSourceId } from "./stableId";

describe("stableId", () => {
  it("should generate deterministic sha256 hex string", async () => {
    const hash1 = await sha256Hex("hello world");
    const hash2 = await sha256Hex("hello world");
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it("should handle unicode characters", async () => {
    const hash = await sha256Hex("こんにちは / 😊");
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64);
  });

  it("should create stable source ID", async () => {
    const id = await stableSourceId("news", "https://example.com/123", 16);
    expect(id).toMatch(/^news_[a-f0-9]{16}$/);
    const id2 = await stableSourceId("news", "https://example.com/123", 16);
    expect(id).toBe(id2);
  });

  it("different inputs should produce different ids", async () => {
    const id1 = await stableSourceId("news", "a");
    const id2 = await stableSourceId("news", "b");
    expect(id1).not.toBe(id2);
  });
});
