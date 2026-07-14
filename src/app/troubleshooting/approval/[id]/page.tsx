import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClientSignatureApproval } from "@/components/client-signature-approval";
import { tickets } from "@/data/mock-data";

export const metadata: Metadata = { title: "Client Approval" };

export default async function ApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = tickets.find((record) => record.id === decodeURIComponent(id));
  if (!ticket) notFound();
  return <ClientSignatureApproval ticket={ticket} />;
}
