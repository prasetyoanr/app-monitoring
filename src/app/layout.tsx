import type { Metadata } from "next";
import { headers } from "next/headers";
import { getCurrentUser } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { getNavigationCounts } from "@/data/app-data";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: { default: "IT Activity Log", template: "%s | IT Activity Log" },
    description: "Internal IT activity records for the Head Office and Factory.",
    openGraph: {
      title: "IT Activity Log",
      description: "IT team activity records, ready for reporting",
      type: "website",
      images: [{ url: `${origin}/og-v2.png`, width: 1536, height: 1024, alt: "IT Activity Log" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "IT Activity Log",
      description: "IT team activity records, ready for reporting",
      images: [`${origin}/og-v2.png`],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const counts = user
    ? await getNavigationCounts()
    : { issues: 0, backups: 0 };
  return (
    <html lang="id">
      <body>
        {user ? (
          <AppShell counts={counts} user={user}>{children}</AppShell>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
