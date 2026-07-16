import {
  backupSubmissionMetadata,
  BackupSubmissionPageContent,
} from "@/components/backup-submission-page";

export const metadata = backupSubmissionMetadata;

export default async function BackupSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BackupSubmissionPageContent token={decodeURIComponent(id)} />;
}
