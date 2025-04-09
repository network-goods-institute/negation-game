import { Button, ButtonProps } from "@/components/ui/button";
import { usePrivy } from "@privy-io/react-auth";
import React, { useState, useCallback } from "react";
import { handleAuthError } from "@/lib/auth/handleAuthError";
import { setPrivyToken } from "@/lib/privy/setPrivyToken";

/**
 * A button that handles authentication before performing an action.
 * If the user is not authenticated, it will trigger a login flow.
 * If they are authenticated, it will refresh the access token before calling onClick.
 */
export const AuthenticatedActionButton = ({ onClick, ...props }: ButtonProps) => {
    const { user, login, authenticated, ready, getAccessToken } = usePrivy();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        // If it's a submit button, don't prevent default to allow form submission
        if (props.type === 'submit') {
            // For submit buttons, we still need to verify authentication
            if (ready && authenticated) {
                try {
                    setIsRefreshing(true);
                    const success = await setPrivyToken();

                    if (!success) {
                        console.error('Token refresh failed, showing login');
                        handleAuthError(new Error("Failed to refresh authentication token"), "refreshing token");
                        login();
                        e.preventDefault();
                        return;
                    }

                    if (onClick) {
                        onClick(e);
                    }
                } catch (error) {
                    console.error('Error refreshing token:', error);
                    handleAuthError(error, "refreshing token");
                    login();
                    e.preventDefault();
                } finally {
                    setIsRefreshing(false);
                }
            } else {
                e.preventDefault();
                login();
            }
            return;
        }

        e.preventDefault();

        // Check if auth is ready and user is authenticated
        if (ready && authenticated) {
            try {
                setIsRefreshing(true);
                const success = await setPrivyToken();

                if (!success) {
                    // Show error toast if user appears to be logged in but no token
                    handleAuthError(new Error("Failed to refresh authentication token"), "refreshing token");
                    login();
                    return;
                }

                onClick?.(e);
            } catch (error) {
                // Show error toast if token refresh fails but user appears authenticated
                handleAuthError(error, "refreshing token");
                login();
            } finally {
                setIsRefreshing(false);
            }
        } else {
            // Force a login refresh
            login();
        }
    }, [authenticated, ready, onClick, login, props.type]);

    const rightLoading = props.rightLoading || isRefreshing;

    return <Button {...props} onClick={handleClick} rightLoading={rightLoading} />;
}; 