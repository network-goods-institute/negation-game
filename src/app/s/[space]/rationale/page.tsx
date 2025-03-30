import { redirect } from "next/navigation";
import { use } from "react";

export default function ViewpointRedirectPage({
    params,
}: {
    params: Promise<{ space: string }>;
}) {
    const { space } = use(params);
    redirect(`/s/${space}`);
} 