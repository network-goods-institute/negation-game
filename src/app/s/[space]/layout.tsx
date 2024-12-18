import { fetchSpace } from "@/actions/fetchSpace";
import { notFound } from "next/navigation";

export default async function SpaceLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ space: string }>;
}>) {
  const { space } = await params;
  const spaceExists = (await fetchSpace(space)) !== null;

  if (!spaceExists) {
    notFound();
  }

  return children;
}
