import ScrollSourceEmbedClient from './ScrollSourceEmbedClient';
import { headers } from 'next/headers';

export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const headersList = await headers();
    const params = await searchParams;

    const sourceUrl = (params.source as string) || headersList.get('referer') || '';

    return <ScrollSourceEmbedClient sourceUrl={sourceUrl} />;
} 