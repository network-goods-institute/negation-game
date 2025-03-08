import { PointPageClient } from "@/app/s/[space]/[encodedPointId]/PointPageClient";

export default async function PointPage({
  params,
  searchParams,
}: {
  params: Promise<{ encodedPointId: string; space: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  return <PointPageClient params={resolvedParams} searchParams={resolvedSearchParams} />;
}
