import React from 'react';
import { render, screen } from '@/lib/tests/test-utils';
import { TopicCard } from '@/components/topic/TopicCard';

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/queries/viewpoints/useLatestViewpointByTopic', () => ({
    useLatestViewpointByTopic: () => ({ data: null }),
}));

jest.mock('@/hooks/ui/useIsMobile', () => ({
    __esModule: true,
    default: () => false,
}));

describe('TopicCard', () => {
    const baseTopic = {
        id: 1,
        name: 'Climate Change',
        rationalesCount: 12,
        latestRationaleAt: new Date('2023-10-10T00:00:00Z'),
        earliestRationaleAt: new Date('2022-01-01T00:00:00Z'),
        latestAuthorUsername: 'alice',
        discourseUrl: null,
    };

    it('renders topic name', () => {
        render(<TopicCard topic={baseTopic} spaceId="global" />);
        expect(screen.getByText('Climate Change')).toBeInTheDocument();
    });

    it('renders rationales count', () => {
        render(<TopicCard topic={baseTopic} spaceId="global" />);
        expect(screen.getByText(/12 rationale/)).toBeInTheDocument();
    });

    it('renders latest author username', () => {
        render(<TopicCard topic={baseTopic} spaceId="global" />);
        expect(screen.getByText(/Latest by/)).toBeInTheDocument();
        expect(screen.getByText('alice')).toBeInTheDocument();
    });
}); 