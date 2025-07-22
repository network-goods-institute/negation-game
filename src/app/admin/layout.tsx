import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Site Administration | Negation Game",
  description: "System administration dashboard for site administrators",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}