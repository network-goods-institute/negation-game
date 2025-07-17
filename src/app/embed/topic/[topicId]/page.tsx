import { TopicEmbedClient } from './TopicEmbedClient';
import { fetchTopicById } from '@/actions/topics/fetchTopicById';
import { fetchViewpointsByTopic } from '@/actions/viewpoints/fetchViewpointsByTopic';
import { decodeId } from '@/lib/negation-game/decodeId';
import { notFound } from 'next/navigation';

interface Props {
  params: {
    topicId: string;
  };
}

export default async function TopicEmbedPage({ params }: Props) {
  const { topicId: rawTopicId } = await params;
  
  // Handle both encoded IDs and raw numbers for testing
  let topicId: number;
  if (/^\d+$/.test(rawTopicId)) {
    // Raw number (for testing)
    topicId = parseInt(rawTopicId);
  } else {
    // Encoded ID (production)
    const decoded = decodeId(rawTopicId);
    if (!decoded) {
      notFound();
    }
    topicId = decoded;
  }

  try {
    const topic = await fetchTopicById(topicId);
    
    if (!topic) {
      notFound();
    }

    const rationales = await fetchViewpointsByTopic(topic.space, topicId);

    return (
      <TopicEmbedClient 
        topic={topic}
        rationales={rationales}
      />
    );
  } catch (error) {
    console.error('Error loading embed topic:', error);
    notFound();
  }
}