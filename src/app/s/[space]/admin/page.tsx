import { TopicsAdminClient } from "./TopicsAdminClient";

export default async function AdminPage({
  params
}: {
  params: Promise<{ space: string }>
}) {
  const { space } = await params;
  return <TopicsAdminClient spaceId={space} />;
}