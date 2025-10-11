'use client';

import { notFound } from 'next/navigation';
import { ReactNode, useLayoutEffect } from 'react';
import { useTheme } from 'next-themes';

interface ExperimentLayoutProps {
  children: ReactNode;
}

export default function ExperimentLayout({ children }: ExperimentLayoutProps) {
  const isEnabled = process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED === 'true';
  const { setTheme, theme } = useTheme();

  useLayoutEffect(() => {
    // Force light mode in experimental rationales - run before paint
    if (theme !== 'light') {
      setTheme('light');
    }
  }, [setTheme, theme]);

  if (!isEnabled) {
    notFound();
  }

  return <>{children}</>;
}