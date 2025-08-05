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

        return (
            <RationaleEmbedClient
                rationale={rationale}
            />
        );
    } catch (error) {
        console.error('Error loading rationale embed:', error);
        notFound();
    }
}