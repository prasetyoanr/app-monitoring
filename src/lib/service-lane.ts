import type { ServiceLane } from "@/data/types";

// An account without a lane works across every lane; a lane account only sees its own.
export function laneAllowsViewer(userLane: ServiceLane | null | undefined, issueLane: ServiceLane | null | undefined) {
  return !userLane || userLane === (issueLane ?? null);
}

// Asset requests go only to Asset staff. Other requests may go to anyone not tied to a
// different lane, so a lane-limited account is never handed work from another lane.
export function laneAllowsAssignee(requestLane: ServiceLane | null | undefined, agentLane: ServiceLane | null | undefined) {
  if (requestLane === "asset") return agentLane === "asset";
  return !agentLane || agentLane === (requestLane ?? null);
}
