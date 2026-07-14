import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { TicketList } from "@/components/ticket-list";

export const metadata: Metadata = { title: "Troubleshooting" };

export default function TicketsPage() {
  return <><PageHeader eyebrow="Internal IT records" title="Troubleshooting" description="Record every support request from the Head Office and Factory for periodic activity reports to management." /><TicketList /></>;
}
