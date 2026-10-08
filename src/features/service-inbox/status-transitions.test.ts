import assert from "node:assert/strict";
import test from "node:test";

import {
  getITRequestStatusOptions,
  getITRequestStatusTransitionRequirement,
  getITStatusAfterWorkPhoto,
} from "./status-transitions";

test("IT waiting approval is entered automatically after work photo availability", () => {
  assert.equal(
    getITStatusAfterWorkPhoto("In Progress", true),
    "Waiting for Client Approval",
  );
  assert.equal(getITStatusAfterWorkPhoto("In Progress", false), "In Progress");
  assert.equal(getITStatusAfterWorkPhoto("New", true), "New");
});

test("IT request cannot select waiting approval manually", () => {
  assert.deepEqual(getITRequestStatusOptions("In Progress"), [
    "In Progress",
    "New",
  ]);
  assert.equal(
    getITRequestStatusTransitionRequirement(
      "In Progress",
      "Waiting for Client Approval",
    ),
    "invalid",
  );
});
