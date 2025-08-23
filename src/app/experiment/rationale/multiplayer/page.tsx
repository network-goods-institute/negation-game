import Link from "next/link";
import { sampleRationale } from "@/data/experiment/multiplayer/sampleData";

export default function MultiplayerRationaleIndexPage() {
  return (
    <div className="fixed inset-0 top-16 bg-gray-50">
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Multiplayer Rationales</h1>
        <p className="text-gray-600 mb-6">Select a rationale to open its live multiplayer map.</p>
        <div className="grid gap-4">
          <Link
            href={`/experiment/rationale/multiplayer/${sampleRationale.id}`}
            className="block border rounded-lg p-4 bg-white hover:shadow"
          >
            <div className="font-semibold">{sampleRationale.title}</div>
            <div className="text-sm text-gray-600">{sampleRationale.description}</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
