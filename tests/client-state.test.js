import test from "node:test";
import assert from "node:assert/strict";
import {
  newerSnapshot,
  retryDelay,
  acceptanceFor,
} from "../src/lib/client-state.js";
const snapshot = (version) => ({
  version,
  election: { state: "open" },
  stats: {},
  results: [],
  observedAt: "2026-10-20T10:00:00Z",
});
test("delayed snapshots cannot roll live counts back to an earlier revision", () => {
  const current = snapshot(42);
  assert.equal(newerSnapshot(current, snapshot(41)), current);
  assert.equal(newerSnapshot(current, snapshot(43)).version, 43);
  // Same revision can update observation time and a schedule-derived state.
  assert.notEqual(newerSnapshot(current, snapshot(42)), current);
  assert.throws(() =>
    newerSnapshot(current, { ...snapshot(44), results: null }),
  );
  assert.throws(() =>
    newerSnapshot(current, { ...snapshot(44), observedAt: "invalid" }),
  );
});
test("failed polling backs off with bounded jitter instead of busy retrying", () => {
  assert.equal(retryDelay(0, 0), 5000);
  assert.equal(retryDelay(1, 0), 10000);
  assert.equal(retryDelay(2, 0), 20000);
  assert.equal(retryDelay(100, 0), 30000);
  assert.ok(retryDelay(100, 0.999) < 30500);
});
test("ballot reconciliation uses office acceptance only and rejects incomplete status", () => {
  assert.equal(acceptanceFor({ acceptedPositions: [1, 3] }, 3), true);
  assert.equal(acceptanceFor({ acceptedPositions: [1, 3] }, 2), false);
  assert.throws(() => acceptanceFor({ userVotes: { 1: 123 } }, 1));
});
