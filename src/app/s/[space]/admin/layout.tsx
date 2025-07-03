import { notFound } from "next/navigation";
import { isUserSpaceAdmin } from "@/utils/adminUtils";
import { getUserId } from "@/actions/users/getUserId";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ space: string }>;
}) {
  const userId = await getUserId();
  if (!userId) {
    return notFound();
  }

  const { space } = await params;
  const isAdmin = await isUserSpaceAdmin(userId, space);
  if (!isAdmin) {
    return notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Space Administration</h1>
        <p className="text-muted-foreground">
          Manage topics, assignments, and permissions for {space}
        </p>
      </div>
      {children}
    </div>
  );
}