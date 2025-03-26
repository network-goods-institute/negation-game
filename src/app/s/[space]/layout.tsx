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
  try {
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
  } catch (error) {
    console.error("Error in SpaceLayout:", error);
    // Return children without the SpaceHeader in case of error
    return <>{children}</>;
  }
}
