import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConnectButton } from "@/components/header/ConnectButton";
import { QueryClientProvider } from "@/components/providers/QueryClientProvider";

// Global user state for mocked useUser
(globalThis as any).__mockUser = null as any;

jest.mock("@privy-io/react-auth", () => ({
    usePrivy: () => ({ ready: true, authenticated: true, user: { id: "did:privy:test" } }),
}));

jest.mock("next/navigation", () => ({
    useRouter: () => ({ prefetch: jest.fn(), push: jest.fn() }),
    usePathname: () => "/",
}));

jest.mock("@/lib/privy/setPrivyToken", () => ({ setPrivyToken: jest.fn(async () => true) }));
jest.mock("@/actions/users/auth", () => ({ clearPrivyCookie: jest.fn(async () => { }) }));

jest.mock("@/queries/users/useUser", () => ({
    userQueryKey: (id?: string) => ["user", id],
    useUser: () => ({ data: (globalThis as any).__mockUser, isLoading: false }),
}));

jest.mock("@/queries/notifications/useNotifications", () => ({
    useUnreadNotificationCount: () => ({ data: 0 }),
}));

jest.mock("@/queries/messages/useUnreadMessageCount", () => ({
    useUnreadMessageCount: () => ({ data: 0 }),
}));

jest.mock("@/hooks/admin/useAdminStatus", () => ({
    useAdminStatus: () => ({ data: { siteAdmin: false, adminSpaces: [], allSpaces: [] } }),
}));

jest.mock("@/components/dialogs/EarningsDialog", () => ({
    EarningsDialog: ({ open }: { open: boolean }) => (open ? <div>EarningsDialog</div> : null),
}));

jest.mock("@/components/dialogs/LeaderboardDialog", () => ({
    LeaderboardDialog: ({ open }: { open: boolean }) => (open ? <div>LeaderboardDialog</div> : null),
}));

jest.mock("@/queries/assignments/useIncompleteAssignmentCount", () => ({
    useIncompleteAssignmentCount: () => 0,
}));

jest.mock("@/actions/users/isUsernameAvailable", () => ({
    isUsernameAvailable: jest.fn(async () => true),
}));

jest.mock("@/mutations/user/useUsernameSignup", () => ({
    useUsernameSignup: () => ({
        mutate: (_: any, opts: any) => {
            (globalThis as any).__mockUser = { id: "did:privy:test", username: _.username, cred: 500 };
            opts?.onSuccess?.((globalThis as any).__mockUser);
        },
        isPending: false,
        isSuccess: false,
    }),
}));

describe("ConnectButton signup flow (E2E)", () => {
    it("opens signup dialog, submits username, closes, and shows authenticated state", async () => {
        (globalThis as any).__mockUser = null;

        render(
            <QueryClientProvider>
                <ConnectButton />
            </QueryClientProvider>
        );

        // Dialog opens for new user
        expect(
            screen.getByRole("dialog", { name: /let's get you started/i })
        ).toBeInTheDocument();

        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "new_user" } });
        fireEvent.blur(input);

        const submit = screen.getByText(/submit/i);
        fireEvent.click(submit);

        // Dialog closes
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).toBeNull();
        });

        // Header shows authenticated state (username visible)
        await waitFor(() => {
            expect(screen.getByText("new_user")).toBeInTheDocument();
        });
    });
});

