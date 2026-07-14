import type { Metadata } from "next";
import { BackupUserList } from "@/components/backup-user-list";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Backup User" };

export default function BackupsPage() {
  return (
    <>
      <PageHeader eyebrow="Internal IT Record" title="Backup User" description="Backup records entered by the IT team for periodic management reporting." />
      <BackupUserList />
    </>
  );
}
