"use client";
import React from "react";
import { logger } from "@/lib/logger";

type Props = {
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

type State = { hasError: boolean };

export class MarketErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    try {
      logger.error("[market/ui] boundary error", { error, info });
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
