import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMonth } from "./finance.js";

test("normalizeMonth defaults to the local calendar month", () => {
  const now = new Date();
  const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  assert.equal(normalizeMonth(), expected);
});
