import type { Metadata } from "next";
import Link from "next/link";

import { requireAdministrator } from "@/auth/session";
import { AccountManager } from "@/components/account-manager";
import { Card, PageHeader } from "@/components/ui";
import { getAccountRecords } from "@/data/account-data";
import { getMasterDataRecords } from "@/data/master-data";

export const metadata: Metadata = { title: "User Management" };

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [accounts, currentUser, masterData] = await Promise.all([
    getAccountRecords(),
    requireAdministrator(),
    getMasterDataRecords(),
  ]);
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const lockedOnly = status === "locked";
  const visibleAccounts = lockedOnly ? accounts.filter((account) => account.isLocked) : accounts;
  return (
    <>
      <PageHeader
        eyebrow="Administrator Only"
        title="User Management"
        description="Manage requesters, GA Admins, GA Supervisors, Senior Approvers, GA Members, and System Administrators."
      />
      {lockedOnly ? (
        <Card className="mb-4 flex flex-col gap-3 border-amber-100 bg-amber-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-bold text-amber-900">Locked accounts</p><p className="mt-1 text-[11px] text-amber-700">Showing {visibleAccounts.length} accounts currently locked after failed login attempts.</p></div>
          <Link href="/accounts" className="inline-flex h-8 items-center justify-center rounded-lg border border-amber-200 bg-white px-3 text-[10px] font-bold text-amber-700 hover:bg-amber-50">Show all</Link>
        </Card>
      ) : null}
      <AccountManager initialAccounts={visibleAccounts} currentUserId={currentUser.id} divisions={masterData.divisions} />
    </>
  );
}
