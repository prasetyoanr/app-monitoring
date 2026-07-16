import type { Metadata } from "next";
import { requireAuthenticatedUser } from "@/auth/session";
import { BackupUserList } from "@/components/backup-user-list";
import { getBackupRecords } from "@/data/app-data";
import { getDivisionOptions } from "@/data/master-data";

export const metadata: Metadata = { title: "Backup User" };

export default async function BackupsPage() {
  const [records, currentUser, divisionOptions] = await Promise.all([
    getBackupRecords(),
    requireAuthenticatedUser(),
    getDivisionOptions(),
  ]);
  return (
    <>
      <BackupUserList initialRecords={records} canManage={currentUser.role === "administrator"} divisionOptions={divisionOptions} />
    </>
  );
}
