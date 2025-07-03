import { TopicsAdminClient } from "./topics/TopicsAdminClientNew";

export default async function AdminPage({ 
  params 
}: { 
  params: Promise<{ space: string }> 
}) {
  const { space } = await params;
  return <TopicsAdminClient spaceId={space} />;
}