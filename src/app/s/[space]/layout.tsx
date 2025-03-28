import { fetchSpace } from "@/actions/fetchSpace";
import { SpaceHeader } from "./SpaceHeader";
import { notFound } from "next/navigation";
import { use } from "react";

export default function SpaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ space: string }>;
}) {
  const { space } = use(params);
  const spaceData = use(fetchSpace(space));

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
