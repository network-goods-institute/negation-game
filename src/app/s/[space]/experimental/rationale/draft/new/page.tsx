"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { createExperimentalDoc } from "@/actions/experimental/rationale/createDoc";

export default function NewExperimentalDraftPage() {
    const router = useRouter();
    const params = useParams();
    const space = (params?.space as string) || "";
    const [isCreating, setIsCreating] = useState(false);

    const create = async () => {
        setIsCreating(true);
        try {
            const { id } = await createExperimentalDoc({});
            router.push(`/s/${encodeURIComponent(space)}/experimental/rationale/draft/${id}`);
        } finally {
            setIsCreating(false);
        }
    };

    React.useEffect(() => {
        create();
    }, []);

    return null;
}