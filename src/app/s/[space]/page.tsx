import SpacePageClient from "@/app/s/[space]/SpacePageClient";

export default async function SpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ space: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  return <SpacePageClient params={resolvedParams} searchParams={resolvedSearchParams} />;
}
