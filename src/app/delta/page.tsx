import { notFound } from "next/navigation";

export default function DeltaRoot() {
    notFound();
}

// This export remains only to avoid Next.js complaining about an empty file
export const revalidate = 0; 