import type { Metadata } from "next";
import { requireITTeam } from "@/auth/session";
import { BackupUserList } from "@/components/backup-user-list";
import { getBackupRecords } from "@/data/app-data";
import { getDivisionOptions } from "@/data/master-data";

export const metadata: Metadata = { title: "Backup User" };

export default async function BackupsPage() {
  await requireITTeam();

  const [records, divisionOptions] = await Promise.all([
    getBackupRecords(),
    getDivisionOptions(),
  ]);

  return (
    <>
      <BackupUserList initialRecords={records} canManage divisionOptions={divisionOptions} />
    </>
  );
}
