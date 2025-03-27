import { fetchSpace } from "@/actions/fetchSpace";
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

    return (
      <>
        {spaceData && <SpaceHeader spaceData={spaceData} />}
        {children}
      </>
    );
  } catch (error) {
    console.error("Error in SpaceLayout:", error);
    // Return children without the SpaceHeader in case of error
    return <>{children}</>;
  }
}
