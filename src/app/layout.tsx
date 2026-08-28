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
    title: { default: "OneService", template: "%s | OneService" },
    description: "Portal Layanan Internal untuk berbagai kebutuhan layanan perusahaan.",
    openGraph: {
      title: "OneService",
      description: "Portal Layanan Internal",
      type: "website",
      images: [{ url: `${origin}/og-v2.png`, width: 1536, height: 1024, alt: "OneService" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "OneService",
      description: "Portal Layanan Internal",
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
    : {
        issues: 0,
        backups: 0,
        newRequests: 0,
        inProgressRequests: 0,
        unreadRequestNotifications: 0,
        inboxNotifications: [],
        requestNotifications: [],
      };
  return (
    <html lang="en">
      <body>
        {user ? (
          <AppShell counts={counts} notifications={{ inbox: counts.inboxNotifications, request: counts.requestNotifications }} user={user}>{children}</AppShell>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
