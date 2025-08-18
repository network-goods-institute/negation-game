"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const ExperimentalCanvas = dynamic(() => import("@/components/experimental/graph/ExperimentalCanvas"), { ssr: false });

export default function ExperimentalRationalePage() {
    const params = useParams();
    const id = params?.id as string;
    const space = params?.space as string;
    return <ExperimentalCanvas docId={id} space={space} />;
}