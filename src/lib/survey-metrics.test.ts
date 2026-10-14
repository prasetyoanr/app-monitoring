import assert from "node:assert/strict";
import test from "node:test";

import { isSmallSurveySample } from "./survey-metrics";

test("a sample below the threshold is flagged, an empty one is not", () => {
  assert.equal(isSmallSurveySample(0), false);
  assert.equal(isSmallSurveySample(1), true);
  assert.equal(isSmallSurveySample(29), true);
  assert.equal(isSmallSurveySample(30), false);
});
