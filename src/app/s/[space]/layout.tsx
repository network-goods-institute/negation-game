import { fetchSpace } from "@/actions/fetchSpace";
import { notFound } from "next/navigation";
import { SpaceHeader } from "./SpaceHeader";

export default async function SpaceLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ space: string }>;
}>) {
  const { space } = await params;
  const spaceData = await fetchSpace(space);

  if (!spaceData) {
    notFound();
  }

  return (
    <>
      <SpaceHeader spaceData={spaceData} />
      {children}
    </>
  );
}
