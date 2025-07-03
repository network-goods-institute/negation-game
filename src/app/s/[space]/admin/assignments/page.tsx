import { AssignmentsAdminClient } from "./AssignmentsAdminClient";

export default async function AssignmentsAdminPage({
  params,
}: {
  params: Promise<{ space: string }>;
}) {
  const { space } = await params;
  return <AssignmentsAdminClient spaceId={space} />;
}