import { fetchSpace } from "@/actions/fetchSpace";
import { SpaceHeader } from "./SpaceHeader";
import { notFound } from "next/navigation";

export default async function SpaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ space: string }>;
}) {
  try {
    const resolvedParams = await params;
    const { space } = resolvedParams;

    if (!space) {
      return notFound();
    }

    const spaceData = await fetchSpace(space);

    if (!spaceData) {
      return notFound();
    }

    return (
      <>
        <SpaceHeader spaceData={spaceData} />
        {children}
      </>
    );
  } catch (error) {
    console.error("Error in space layout:", error);
    return notFound();
  }
}
