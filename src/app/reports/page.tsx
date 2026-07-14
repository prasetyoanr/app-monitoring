import type { Metadata } from "next";
import { ReportsCenter } from "@/components/reports-center";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        eyebrow="IT activity reporting"
        title="Reports"
        description="Centralized periodic reporting for all IT activities. Select a date range or month, then export the required report."
      />
      <ReportsCenter />
    </>
  );
}
