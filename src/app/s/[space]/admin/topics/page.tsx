import { TopicsAdminClient } from "./TopicsAdminClientNew";

export default async function TopicsAdminPage({
  params,
}: {
  params: Promise<{ space: string }>;
}) {
  const { space } = await params;
  return <TopicsAdminClient spaceId={space} />;
}