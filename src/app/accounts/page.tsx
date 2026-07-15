import type { Metadata } from "next";

import { requireAdministrator } from "@/auth/session";
import { AccountManager } from "@/components/account-manager";
import { PageHeader } from "@/components/ui";
import { getAccountRecords } from "@/data/account-data";

export const metadata: Metadata = { title: "Account Management" };

export default async function AccountsPage() {
  const [accounts, currentUser] = await Promise.all([
    getAccountRecords(),
    requireAdministrator(),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Administrator only"
        title="Account Management"
        description="Create administrator or boss accounts, reset passwords, and manage account access."
      />
      <AccountManager initialAccounts={accounts} currentUserId={currentUser.id} />
    </>
  );
}
