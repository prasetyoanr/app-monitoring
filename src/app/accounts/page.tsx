import type { Metadata } from "next";

import { requireAdministrator } from "@/auth/session";
import { AccountManager } from "@/components/account-manager";
import { PageHeader } from "@/components/ui";
import { getAccountRecords } from "@/data/account-data";
import { getMasterDataRecords } from "@/data/master-data";

export const metadata: Metadata = { title: "Manajemen Pengguna" };

export default async function AccountsPage() {
  const [accounts, currentUser, masterData] = await Promise.all([
    getAccountRecords(),
    requireAdministrator(),
    getMasterDataRecords(),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Khusus administrator"
        title="Manajemen Pengguna"
        description="Kelola akun, divisi, staf, atasan, dan akses sistem. Semua akun aktif dapat menjadi pemohon tiket."
      />
      <AccountManager initialAccounts={accounts} currentUserId={currentUser.id} divisions={masterData.divisions} />
    </>
  );
}
