import type { ServiceLane } from "@/data/types";

// Asset requests are managed by Asset-lane accounts only. An Admin tied to the Asset lane
// still receives every general request; Admins without it simply never see Asset requests.
export function laneAllowsViewer(userLane: ServiceLane | null | undefined, issueLane: ServiceLane | null | undefined) {
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
