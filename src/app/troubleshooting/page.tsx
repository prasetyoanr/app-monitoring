import type { Metadata } from "next";
import { TicketList } from "@/components/ticket-list";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Troubleshooting" };

export default function TroubleshootingPage() {
  return <><PageHeader eyebrow="Internal IT records" title="Troubleshooting" description="Record every support request from the Head Office and Factory for periodic activity reports to management." /><TicketList /></>;
}
