import { PointPageClient } from "@/app/s/[space]/[encodedPointId]/PointPageClient";
import { notFound } from "next/navigation";
import { decodeId } from "@/lib/decodeId";
import { validatePointExists } from "@/actions/validatePointId";

export default async function PointPage({
  params,
  searchParams,
}: {
  params: Promise<{ encodedPointId: string; space: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  try {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;

    const { encodedPointId } = resolvedParams;

    if (!encodedPointId) {
      return notFound();
    }

    const pointId = decodeId(encodedPointId);

    if (pointId === null) {
      return notFound();
    }

    const exists = await validatePointExists(pointId);
    if (!exists) {
      console.warn(`Point with ID ${pointId} does not exist in database`);
      return notFound();
    }

    return <PointPageClient params={resolvedParams} searchParams={resolvedSearchParams} />;
  } catch (error) {
    console.error("Error in point page:", error);
    return notFound();
  }
}
