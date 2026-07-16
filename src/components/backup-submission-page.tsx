import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClientBackupSubmission } from "@/components/client-backup-submission";
import { getBackupInvitationByToken } from "@/data/backup-invitations";
import { getDivisionOptions } from "@/data/master-data";

export const backupSubmissionMetadata: Metadata = {
  title: "Backup Account Registration",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export async function BackupSubmissionPageContent({ token }: { token: string }) {
  const [invitation, divisionOptions] = await Promise.all([
    getBackupInvitationByToken(token),
    getDivisionOptions(),
  ]);
  if (!invitation) notFound();
  return (
    <ClientBackupSubmission
      invitation={invitation}
      divisionOptions={divisionOptions}
    />
  );
}
