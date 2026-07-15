import type { Metadata } from "next";
import { requireAuthenticatedUser } from "@/auth/session";
import { BackupUserList } from "@/components/backup-user-list";
import { PageHeader } from "@/components/ui";
import { getBackupRecords } from "@/data/app-data";

export const metadata: Metadata = { title: "Backup User" };

export default async function BackupsPage() {
  const [records, currentUser] = await Promise.all([
    getBackupRecords(),
    requireAuthenticatedUser(),
  ]);
  return (
    <>
      <PageHeader eyebrow="Internal IT Record" title="Backup User" description="Backup records entered by the IT team for periodic management reporting." />
      <BackupUserList initialRecords={records} canManage={currentUser.role === "administrator"} />
    </>
  );
}
