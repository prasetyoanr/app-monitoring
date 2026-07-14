import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClientSignatureApproval } from "@/components/client-signature-approval";
import { getApprovalByToken } from "@/data/app-data";

export const metadata: Metadata = { title: "Client Approval" };

export default async function ApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const approval = await getApprovalByToken(decodeURIComponent(id));
  if (!approval) notFound();
  return <ClientSignatureApproval approval={approval} />;
}
