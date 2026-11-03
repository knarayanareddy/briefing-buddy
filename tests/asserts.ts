/**
 * Minimal local replacement for
 *   https://deno.land/std@0.168.0/testing/asserts.ts
 * (import-mapped via tests/import_map.json) so edge-function unit tests run
 * in environments that cannot reach deno.land (offline CI mirrors, sandboxes).
 * Implements the subset this repo's tests actually use:
 *   assert, assertEquals, assertExists.
 */

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

export function assert(expr: unknown, msg = "Assertion failed"): asserts expr {
  if (!expr) {
    throw new AssertionError(msg);
  }
}

export function assertExists<T>(
  value: T,
  msg?: string,
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new AssertionError(
      msg ?? `Expected value to exist, but got ${format(value)}`,
    );
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source === b.source && a.flags === b.flags;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (
    typeof a === "object" && a !== null &&
    typeof b === "object" && b !== null
  ) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

function format(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  try {
    const json = JSON.stringify(value, null, 2);
    return json === undefined ? String(value) : json;
  } catch {
    return String(value);
  }
}

export function assertEquals(
  actual: unknown,
  expected: unknown,
  msg?: string,
): void {
  if (!deepEqual(actual, expected)) {
    throw new AssertionError(
      msg ??
        `Values are not equal:\n  actual:   ${format(actual)}\n  expected: ${format(expected)}`,
    );
  }
}
