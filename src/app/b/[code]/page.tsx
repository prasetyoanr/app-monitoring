import {
  backupSubmissionMetadata,
  BackupSubmissionPageContent,
} from "@/components/backup-submission-page";

export const metadata = backupSubmissionMetadata;

export default async function ShortBackupSubmissionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <BackupSubmissionPageContent token={decodeURIComponent(code)} />;
}
