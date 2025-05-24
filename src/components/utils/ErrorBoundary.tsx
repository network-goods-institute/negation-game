import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error boundary component that catches server action errors
 * and provides a more graceful fallback experience
 */
export class ServerActionErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error(
            "ServerActionErrorBoundary caught an error:",
            error,
            errorInfo
        );
    }

    isServerActionError(): boolean {
        const { error } = this.state;
        return !!(
            error?.message?.includes("Failed to find Server Action") &&
            error?.message?.includes("Cannot read properties of undefined (reading 'workers')")
        );
    }

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.isServerActionError()) {
                return (
                    this.props.fallback || (
                        <div className="p-4 rounded-md bg-yellow-50 border border-yellow-200">
                            <h3 className="text-sm font-medium text-yellow-800">
                                There was a temporary error with the server
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                <p>The content is loading. Please try again in a moment.</p>
                                <button
                                    onClick={() => this.setState({ hasError: false, error: null })}
                                    className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    )
                );
            }

            // Generic fallback for other errors
            return (
                this.props.fallback || (
                    <div className="p-4 rounded-md bg-red-50 border border-red-200">
                        <h3 className="text-sm font-medium text-red-800">
                            Something went wrong
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                            <p>There was an error loading this content.</p>
                            <button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )
            );
        }

        return this.props.children;
    }
} 