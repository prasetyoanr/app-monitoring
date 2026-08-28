import { Card, PageHeader } from "@/components/ui";

export default function NewRequestLoading() {
  return (
    <div className="w-full" aria-busy="true" aria-live="polite">
      <PageHeader
        eyebrow="Service Request"
        title="Preparing request form"
        description="Loading the form for the selected destination division."
      />
      <Card className="space-y-5 p-4 sm:p-5">
        <span className="sr-only">Loading request form</span>
        <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="h-36 animate-pulse rounded-xl bg-slate-100" />
        <div className="flex justify-end border-t border-slate-100 pt-5">
          <div className="h-11 w-36 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </Card>
    </div>
  );
}
