'use client';

import { notFound } from 'next/navigation';
import { ReactNode } from 'react';

interface ExperimentLayoutProps {
  children: ReactNode;
}

export default function ExperimentLayout({ children }: ExperimentLayoutProps) {
  const isEnabled = process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED === 'true';
  
  if (!isEnabled) {
    notFound();
  }
  
  return <>{children}</>;
}