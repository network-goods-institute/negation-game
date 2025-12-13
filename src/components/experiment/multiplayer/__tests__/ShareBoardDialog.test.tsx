import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareBoardDialog } from "../ShareBoardDialog";
import { listShareLinks, listCollaborators, setUserAccess } from "@/actions/experimental/rationaleAccess";
import { fetchAllUsers } from "@/actions/users/fetchAllUsers";
import { toast } from "sonner";

jest.mock("@/actions/experimental/rationaleAccess", () => ({
  createShareLink: jest.fn(),
  listShareLinks: jest.fn(async () => []),
  revokeShareLink: jest.fn(),
  setUserAccess: jest.fn(),
  listCollaborators: jest.fn(async () => []),
  removeUserAccess: jest.fn(),
}));

jest.mock("@/actions/users/fetchAllUsers", () => ({
  fetchAllUsers: jest.fn(async () => []),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("ShareBoardDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listShareLinks as jest.Mock).mockResolvedValue([]);
    (listCollaborators as jest.Mock).mockResolvedValue([]);
    (fetchAllUsers as jest.Mock).mockResolvedValue([]);
    (setUserAccess as jest.Mock).mockResolvedValue({});
    (toast.success as jest.Mock).mockClear();
    (toast.error as jest.Mock).mockClear();
  });

  it("disables sharing when user is not the owner", async () => {
    render(
      <ShareBoardDialog
        docId="doc-1"
        slug="doc-1"
        open={true}
        onOpenChange={() => {}}
        accessRole="viewer"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Only the owner can manage sharing/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Copy/i })).toBeDisabled();
  });

  it("hides the current user from the collaborator list", async () => {
    (listCollaborators as jest.Mock).mockResolvedValue([
      { userId: "me", username: "me-user", role: "owner", grantedBy: null, createdAt: new Date() },
      { userId: "other", username: "other-user", role: "editor", grantedBy: "me", createdAt: new Date() },
    ]);

    render(
      <ShareBoardDialog
        docId="doc-1"
        slug="doc-1"
        open={true}
        onOpenChange={() => {}}
        accessRole="owner"
        currentUserId="me"
        currentUsername="me-user"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("other-user")).toBeInTheDocument();
    });

    expect(screen.queryByText("me-user")).not.toBeInTheDocument();
  });

  it("keeps dropdown options visible after selecting a user", async () => {
    (listCollaborators as jest.Mock).mockResolvedValue([]);
    (fetchAllUsers as jest.Mock).mockResolvedValue([{ id: "u1", username: "alice" }]);

    const user = userEvent.setup();
    render(
      <ShareBoardDialog
        docId="doc-1"
        slug="doc-1"
        open={true}
        onOpenChange={() => {}}
        accessRole="owner"
        currentUserId="me"
        currentUsername="me-user"
      />
    );

    const input = screen.getByPlaceholderText(/Username/i);
    await user.click(input);
    await waitFor(() => {
      expect(screen.getByText("alice")).toBeInTheDocument();
    });

    await user.click(screen.getByText("alice"));

    await user.click(input);
    await waitFor(() => {
      expect(screen.getByText("alice")).toBeInTheDocument();
    });
  });

  it("marks share links that work while logged out", async () => {
    (listShareLinks as jest.Mock).mockResolvedValue([
      { id: "link-1", token: "token-1", role: "viewer", requireLogin: false, grantPermanentAccess: false, expiresAt: null, createdAt: new Date().toISOString() },
    ]);

    render(
      <ShareBoardDialog
        docId="doc-1"
        slug="doc-1"
        open={true}
        onOpenChange={() => {}}
        accessRole="owner"
        currentUserId="me"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Public/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/No sign-in needed/i)).toBeInTheDocument();
    expect(screen.getByText(/token-1/)).toBeInTheDocument();
  });

  it("uses typed username as the add input", async () => {
    (fetchAllUsers as jest.Mock).mockResolvedValue([{ id: "u1", username: "alice" }]);
    (listCollaborators as jest.Mock).mockResolvedValue([]);

    const user = userEvent.setup();
    render(
      <ShareBoardDialog
        docId="doc-1"
        slug="doc-1"
        open={true}
        onOpenChange={() => {}}
        accessRole="owner"
        currentUserId="me"
        currentUsername="me-user"
      />
    );

    await user.type(screen.getByPlaceholderText(/Username/i), "alice");
    await user.click(screen.getByRole("button", { name: /Add/i }));

    await waitFor(() => {
      expect(setUserAccess).toHaveBeenCalledWith("doc-1", "u1", "viewer");
    });
  });

  it("shows a toast when the typed user does not exist", async () => {
    (fetchAllUsers as jest.Mock).mockResolvedValue([]);
    (listCollaborators as jest.Mock).mockResolvedValue([]);

    const user = userEvent.setup();
    render(
      <ShareBoardDialog
        docId="doc-1"
        slug="doc-1"
        open={true}
        onOpenChange={() => {}}
        accessRole="owner"
        currentUserId="me"
      />
    );

    await user.type(screen.getByPlaceholderText(/Username/i), "ghost");
    await user.click(screen.getByRole("button", { name: /Add/i }));

    expect(setUserAccess).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("keeps revoke controls revealable for active links", async () => {
    (listShareLinks as jest.Mock).mockResolvedValue([
      { id: "link-1", token: "token-1", role: "editor", requireLogin: true, grantPermanentAccess: false, expiresAt: null, createdAt: new Date().toISOString() },
    ]);

    render(
      <ShareBoardDialog
        docId="doc-1"
        slug="doc-1"
        open={true}
        onOpenChange={() => {}}
        accessRole="owner"
        currentUserId="me"
      />
    );

    const revokeButton = await screen.findByRole("button", { name: /Revoke link/i });

    expect(revokeButton.parentElement?.className).toContain("group");
  });

  it("supports closing via the top-right control", async () => {
    const handleOpenChange = jest.fn();
    const user = userEvent.setup();

    render(
      <ShareBoardDialog
        docId="doc-1"
        slug="doc-1"
        open={true}
        onOpenChange={handleOpenChange}
        accessRole="owner"
        currentUserId="me"
      />
    );

    await user.click(screen.getByRole("button", { name: /Close sharing dialog/i }));

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
