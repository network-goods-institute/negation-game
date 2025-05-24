'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AIAssistant from '@/components/chatbot/ai/AIAssistant';


export default function ChatPageClient() {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <AIAssistant />
        </QueryClientProvider>
    );
} 