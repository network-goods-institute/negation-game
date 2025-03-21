import { Button, ButtonProps } from "@/components/ui/button";
import { usePrivy } from "@privy-io/react-auth";
import React, { useState, useCallback } from "react";

/**
 * A button that handles authentication before performing an action.
 * If the user is not authenticated, it will trigger a login flow.
 * If they are authenticated, it will refresh the access token before calling onClick.
 */
export const AuthenticatedActionButton = ({ onClick, ...props }: ButtonProps) => {
    const { user, login, authenticated, ready, getAccessToken } = usePrivy();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        // Prevent default to handle auth flow
        e.preventDefault();

        // Check if auth is ready and user is authenticated
        if (ready && authenticated) {
            try {
                setIsRefreshing(true);
                const token = await getAccessToken();

                if (!token) {
                    login();
                    return;
                }

                onClick?.(e);
            } catch (error) {
                login();
            } finally {
                setIsRefreshing(false);
            }
        } else {
            // Force a login refresh
            login();
        }
    }, [authenticated, ready, onClick, login, getAccessToken]);

    const rightLoading = props.rightLoading || isRefreshing;

    return <Button {...props} onClick={handleClick} rightLoading={rightLoading} />;
}; 