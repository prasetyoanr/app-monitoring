import type { ServiceLane } from "@/data/types";

// Asset requests are worked on by Asset-lane accounts only. Every Admin can still SEE them
// (read-only history, so the one who forwarded a request can follow it); only Asset-lane
// Admins may act on them.
export function laneAllowsActor(userLane: ServiceLane | null | undefined, issueLane: ServiceLane | null | undefined) {
  return issueLane !== "asset" || userLane === "asset";
}

// Asset requests go only to Asset accounts. General requests may go to anyone except Asset
// staff, whose job is limited to Asset requests.
export function laneAllowsAssignee(
  requestLane: ServiceLane | null | undefined,
  agent: { role?: string; serviceLane?: ServiceLane | null },
) {
  if (requestLane === "asset") return agent.serviceLane === "asset";
  return !(agent.role === "service_agent" && agent.serviceLane === "asset");
}
