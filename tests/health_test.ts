import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { computeNextRetry } from "../supabase/functions/_shared/connectorHealth.ts";

Deno.test("computeNextRetry - exponential backoff", () => {
  const now = Date.now();
  
  // 1st failure: 1 min
  const retry1 = computeNextRetry(1);
  const diff1 = retry1.getTime() - now;
  assert(diff1 >= 59000 && diff1 <= 61000, `Expected ~60s, got ${diff1}ms`);

  // 2nd failure: 2 mins
  const retry2 = computeNextRetry(2);
  const diff2 = retry2.getTime() - now;
  assert(diff2 >= 119000 && diff2 <= 121000, `Expected ~120s, got ${diff2}ms`);

  // 6th failure: 32 mins
  const retry6 = computeNextRetry(6);
  const diff6 = retry6.getTime() - now;
  assert(diff6 >= 32 * 60 * 1000 - 1000 && diff6 <= 32 * 60 * 1000 + 1000, `Expected ~32m, got ${diff6}ms`);

  // 7th failure: capped at 60 mins
  const retry7 = computeNextRetry(7);
  const diff7 = retry7.getTime() - now;
  assert(diff7 >= 60 * 60 * 1000 - 1000 && diff7 <= 60 * 60 * 1000 + 1000, `Expected ~60m cap, got ${diff7}ms`);
  
  // 10th failure: still capped at 60 mins
  const retry10 = computeNextRetry(10);
  const diff10 = retry10.getTime() - now;
  assert(diff10 >= 60 * 60 * 1000 - 1000 && diff10 <= 60 * 60 * 1000 + 1000, `Expected ~60m cap, got ${diff10}ms`);
});
