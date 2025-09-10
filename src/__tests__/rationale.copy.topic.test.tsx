import React from "react";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";

// Polyfill ResizeObserver for components that rely on it (e.g., xyflow/shadcn)
(global as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock router and pathname for space detection
jest.mock("next/navigation", () => {
  const actual = jest.requireActual("next/navigation");
  return {
    ...actual,
    usePathname: () => "/s/testspace/rationale/new",
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
    useSearchParams: () => ({ get: () => null }),
  };
});

// Mock user to pass auth gate
jest.mock("@/queries/users/useUser", () => ({
  useUser: () => ({ data: { id: "user-1", username: "tester" }, isLoading: false }),
}));

// Mock space to provide a space id
jest.mock("@/queries/space/useSpace", () => ({
  useSpace: () => ({ data: { id: "testspace", icon: null } }),
}));

// Mock permissions to avoid restriction paths
jest.mock("@/hooks/topics/useCanCreateRationale", () => ({
  useCanCreateRationale: () => ({ data: { canCreate: true, isRestricted: false }, isLoading: false }),
}));
jest.mock("@/hooks/admin/useAdminStatus", () => ({
  useIsSpaceAdmin: () => ({ isAdmin: true }),
}));
jest.mock("@/hooks/spaces/useSpaceTopicCreationPermission", () => ({
  useSpaceTopicCreationPermission: () => ({ data: true, isLoading: false }),
}));

// Provide topics consistently for both page and TopicSelector internal query
const topics = [
  { id: 1, name: "Climate", space: "testspace" },
  { id: 2, name: "Economy", space: "testspace" },
];
jest.mock("@/queries/topics/useTopics", () => ({
  useTopics: () => ({ data: topics }),
}));
jest.mock("@/actions/topics/createTopic", () => ({
  createTopic: jest.fn().mockResolvedValue(undefined),
}));

// Mock heavy components
jest.mock("@/components/rationale/PointsFeedContainer", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/rationale/RationaleGraph", () => ({
  __esModule: true,
  default: () => <div data-testid="graph" />,
}));
jest.mock("@/components/rationale/EnhancedRationalePointsList", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/cards/EnhancedRationalePointCardWrapper.tsx", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/cards/PointCard.tsx", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/rationale/NewRationaleHeader", () => ({
  __esModule: true,
  default: () => <div />,
}));
jest.mock("@/components/rationale/DraftSavedIndicator", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("remark-gfm", () => ({
  __esModule: true,
  default: () => null,
}));

// Under test: New Rationale page component
import NewRationalePage from "@/app/s/[space]/rationale/new/page";

describe("New Rationale - topic handling on copy", () => {
  beforeEach(() => {
    // Ensure path matches mock
    Object.defineProperty(window, "location", {
      value: { pathname: "/s/testspace/rationale/new" },
      writable: true,
    });

    sessionStorage.clear();
  });

  it("carries over topic from copy and allows editing (not locked)", async () => {
    const copyData = {
      isCopyOperation: true,
      copiedFromId: "vp-1",
      title: "Copied Title",
      description: "Copied Description",
      topic: "Climate",
      topicId: 1,
      graph: { nodes: [{ id: "statement", type: "statement", position: { x: 0, y: 0 }, data: { statement: "Copied Title" } }], edges: [] },
    };
    sessionStorage.setItem("copyingViewpoint:testspace", JSON.stringify(copyData));

    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <NewRationalePage />
      </QueryClientProvider>
    );

    // Header shows editable Topic selector (label present)
    expect(await screen.findByText("Topic")).toBeInTheDocument();

    // Selected value should reflect carried-over topic
    // Select trigger renders the current value text
    expect(screen.getByText("Climate")).toBeInTheDocument();

    // Verify the TopicSelector is present and not showing locked hint
    expect(screen.queryByText(/Topic locked/i)).toBeNull();

    // Verify the TopicSelector button is present (indicating it's editable)
    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger).toBeInTheDocument();
    expect(selectTrigger).toHaveAttribute('aria-expanded', 'false'); // Dropdown is closed but functional
  });

  it("aligns topic name when only topicId is provided in copy", async () => {
    const copyData = {
      isCopyOperation: true,
      copiedFromId: "vp-2",
      title: "Copied Title",
      description: "Copied Description",
      topicId: 1,
      graph: { nodes: [{ id: "statement", type: "statement", position: { x: 0, y: 0 }, data: { statement: "Copied Title" } }], edges: [] },
    };
    sessionStorage.setItem("copyingViewpoint:testspace", JSON.stringify(copyData));

    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <NewRationalePage />
      </QueryClientProvider>
    );

    // After topics load, the selector should show the name for topicId=1
    expect(await screen.findByText("Climate")).toBeInTheDocument();
  });
});


