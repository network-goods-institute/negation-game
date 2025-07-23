import SourceEmbedClient from './SourceEmbedClient';
import { headers } from 'next/headers';

export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const headersList = await headers();
    const params = await searchParams;

    // Check for source in query params first (for testing), then fall back to referer
    const sourceUrl = (params.source as string) || headersList.get('referer') || '';

    return <SourceEmbedClient sourceUrl={sourceUrl} />;
} 