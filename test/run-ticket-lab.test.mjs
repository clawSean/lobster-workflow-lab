import test from "node:test";
import assert from "node:assert/strict";

import { readTaskJson } from "../src/run-ticket-lab.mjs";

test("readTaskJson returns the plugin JSON payload", () => {
  const value = { category: "sync", urgency: "normal" };
  assert.deepEqual(
    readTaskJson({ ok: true, output: { details: { json: value } } }),
    value
  );
});

test("readTaskJson rejects a failed invocation", () => {
  assert.throws(
    () => readTaskJson({ ok: false, error: { message: "boom" } }),
    /boom/
  );
});

test("readTaskJson rejects non-object JSON", () => {
  assert.throws(
    () => readTaskJson({ ok: true, output: { details: { json: ["nope"] } } }),
    /no JSON object/
  );
});
