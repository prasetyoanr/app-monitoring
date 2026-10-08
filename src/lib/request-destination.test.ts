import assert from "node:assert/strict";
import test from "node:test";
import { isGaDivisionSlug, requestDestinationError } from "./request-destination";

const ga = { id: "ga-id", slug: "ga", isServiceTarget: true };

test("all other divisions can submit to active GA", () => {
  for (const origin of ["finance-id", "it-id", "hr-id", "purchase-id"]) {
    assert.equal(requestDestinationError(origin, ga), null);
  }
});

test("GA cannot submit to itself", () => {
  assert.match(requestDestinationError(ga.id, ga)!, /own division/);
});

test("a destination being enabled does not allow non-GA requests", () => {
  assert.match(requestDestinationError("finance-id", { ...ga, id: "it-id", slug: "it-team" })!, /only.*GA/);
});

test("missing origin, missing GA and inactive GA fail closed", () => {
  assert.match(requestDestinationError(null, ga)!, /no assigned division/);
  assert.match(requestDestinationError("finance-id", undefined)!, /only.*GA/);
  assert.match(requestDestinationError("finance-id", { ...ga, isServiceTarget: false })!, /not currently accepting/);
});

test("renaming GA does not change its destination identity", () => {
  const renamed = { ...ga, name: "General Affairs" };
  assert.equal(requestDestinationError("finance-id", renamed), null);
});

test("GA is recognised under the slug used by the production database", () => {
  assert.equal(isGaDivisionSlug("ga"), true);
  assert.equal(isGaDivisionSlug("general-affair"), true);
  assert.equal(isGaDivisionSlug("it-team"), false);
  assert.equal(isGaDivisionSlug(null), false);
  assert.equal(requestDestinationError("finance-id", { ...ga, slug: "general-affair" }), null);
});
