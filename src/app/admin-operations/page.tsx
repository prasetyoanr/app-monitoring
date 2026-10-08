import type { Metadata } from "next";

import { AdminOperationsCenter } from "@/components/admin-operations-center";
import { PageHeader } from "@/components/ui";
import { getAdminOperationRecords } from "@/data/admin-operations";

export const metadata: Metadata = { title: "Admin Operations" };

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminOperationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedView = single(params.view);
  const initialView = ["stalled", "unassigned", "invalid"].includes(requestedView)
    ? requestedView as "stalled" | "unassigned" | "invalid"
    : "all";
  const records = await getAdminOperationRecords();

  return (
    <div className="admin-standard-type">
      <PageHeader
        eyebrow="Administrator Only"
        title="Admin Operations"
        description="Recover stalled, unassigned, or invalid work without bypassing approval and operational history."
      />
      <AdminOperationsCenter initialRecords={records} initialView={initialView} />
    </div>
  );
}
