import SourceEmbedClient from './SourceEmbedClient';

export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const params = await searchParams;
    const sourceUrl = (params.source ?? '') as string;
    return <SourceEmbedClient sourceUrl={sourceUrl} />;
} 