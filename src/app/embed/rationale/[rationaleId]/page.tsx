import { RationaleEmbedClient } from './RationaleEmbedClient';
import { fetchViewpointForEmbed } from '@/actions/viewpoints/fetchViewpoint';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{
        rationaleId: string;
    }>;
}

export default async function RationaleEmbedPage({ params }: Props) {
    const { rationaleId } = await params;

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
            />
        );
    } catch (error) {
        console.error('Error loading rationale embed:', error);
        notFound();
    }
}