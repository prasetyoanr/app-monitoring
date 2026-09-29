import { Card, PageHeader } from "@/components/ui";

export default function NewRequestLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl" aria-busy="true" aria-live="polite">
      <div className="mb-4 h-10 w-32 animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none" />
      <PageHeader
        eyebrow="General Affairs"
        title="Create a GA request"
        description="Preparing your request form..."
      />
      <div className="mb-5 h-16 animate-pulse rounded-2xl bg-emerald-50 motion-reduce:animate-none" />
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
