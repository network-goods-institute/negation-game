import { RationaleEmbedClient } from './RationaleEmbedClient';
import { fetchViewpointForEmbed } from '@/actions/viewpoints/fetchViewpoint';
import { notFound } from 'next/navigation';import { logger } from "@/lib/logger";

interface Props {
    params: Promise<{
        rationaleId: string;
    }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RationaleEmbedPage({ params, searchParams }: Props) {
    const { rationaleId } = await params;
    const { from } = await searchParams;

    try {
        const rationale = await fetchViewpointForEmbed(rationaleId);

        if (!rationale) {
            notFound();
        }

        if ((rationale.space ?? 'scroll') !== 'scroll') {
            notFound();
        }

        return (
            <RationaleEmbedClient
                rationale={{ ...rationale, space: 'scroll' }}
                from={from as string}
            />
        );
    } catch (error) {
        logger.error('Error loading rationale embed:', error);
        notFound();
    }
}