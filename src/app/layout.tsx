import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { getCurrentUser } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { PwaRegistration } from "@/components/pwa-registration";
import { getNavigationCounts } from "@/data/app-data";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#004d32",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: { default: "General Affairs Management System", template: "%s | General Affairs Management System" },
    description: "GA services and activities for a wide range of company needs.",
    openGraph: {
      title: "General Affairs Management System",
      description: "GA Services and Activities",
      type: "website",
      images: [{ url: `${origin}/og-v2.png`, width: 1536, height: 1024, alt: "General Affairs Management System" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "General Affairs Management System",
      description: "GA Services and Activities",
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
        unreadWorkflowNotifications: 0,
        inboxNotifications: [],
        requestNotifications: [],
        workflowNotifications: [],
        adminAlerts: [],
      };
  return (
    <html lang="en">
      <body>
        <PwaRegistration />
        {user ? (
          <AppShell counts={counts} notifications={{ inbox: counts.inboxNotifications, request: counts.requestNotifications, workflow: counts.workflowNotifications, admin: counts.adminAlerts }} user={user}>{children}</AppShell>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
