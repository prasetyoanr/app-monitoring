import type { IssueStatus } from "@/data/types";

export type InboxProfileKey = "it-service" | "basic-service";

export interface ServiceInboxProfile {
  key: InboxProfileKey;
  label: string;
  features: {
    approvalQr: boolean;
    directCompletion: boolean;
    manualIssueCreation: boolean;
    requesterPhoto: boolean;
    workPhoto: boolean;
  };
  editableStatuses: readonly IssueStatus[];
}

const itServiceProfile: ServiceInboxProfile = {
  key: "it-service",
  label: "IT Service",
  features: {
    approvalQr: true,
    directCompletion: false,
    manualIssueCreation: true,
    requesterPhoto: true,
    workPhoto: true,
  },
  editableStatuses: ["New", "In Progress", "Waiting for Client Approval", "Reopened"],
};

const basicServiceProfile: ServiceInboxProfile = {
  key: "basic-service",
  label: "Basic Service",
  features: {
    approvalQr: false,
    directCompletion: true,
    manualIssueCreation: false,
    requesterPhoto: false,
    workPhoto: false,
  },
  editableStatuses: ["New", "In Progress", "Completed", "Reopened"],
};

export const serviceInboxProfiles = [
  itServiceProfile,
  basicServiceProfile,
] as const satisfies readonly ServiceInboxProfile[];

const profilesByKey = new Map(
  serviceInboxProfiles.map((profile) => [profile.key, profile]),
);

export function getServiceInboxProfile(
  key: string | null | undefined,
): ServiceInboxProfile {
  return profilesByKey.get(key as InboxProfileKey) ?? basicServiceProfile;
}

export function isInboxProfileKey(value: string): value is InboxProfileKey {
  return profilesByKey.has(value as InboxProfileKey);
}
