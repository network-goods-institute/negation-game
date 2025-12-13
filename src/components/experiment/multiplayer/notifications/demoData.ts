export type MultiplayerNotificationType =
  | "negation"
  | "objection"
  | "support"
  | "comment"
  | "upvote";

export interface MultiplayerBoardNotificationSummary {
  boardId: string;
  boardTitle: string;
  notifications: Array<{
    type: MultiplayerNotificationType;
    message: string;
  }>;
  totalCount?: number;
  unreadCount?: number;
}

export interface MultiplayerNotification {
  id: string;
  boardId: string;
  type: MultiplayerNotificationType;
  userName: string;
  action: string;
  pointTitle: string;
  pointId: string;
  timestamp: string;
  isRead: boolean;
  commentPreview?: string;
}

export const demoBoardSummaries: MultiplayerBoardNotificationSummary[] = [
  {
    boardId: "board-1",
    boardTitle: "Mechanism Design Workshop",
    notifications: [
      { type: "negation", message: 'Sarah Chen negated "Market fees should stay flat"' },
      { type: "support", message: 'Michael Torres supported "Auctions align incentives"' },
      { type: "comment", message: "Alex Kumar left a comment on your proposal" },
    ],
  },
  {
    boardId: "board-2",
    boardTitle: "Decentralization Tradeoffs",
    notifications: [
      { type: "objection", message: "Jordan Lee objected to the coordination plan" },
      { type: "upvote", message: "Taylor Park upvoted your point on validator rewards" },
    ],
  },
  {
    boardId: "board-3",
    boardTitle: "Public Goods Funding",
    notifications: [
      { type: "support", message: "Casey Rodriguez supported your grant framing" },
      { type: "comment", message: "Priya Das shared feedback on your impact metric" },
    ],
  },
];

export const demoNotifications: MultiplayerNotification[] = [
  {
    id: "1",
    boardId: "board-1",
    type: "negation",
    userName: "Sarah Chen",
    action: "negated your point",
    pointTitle: "Shared security increases governance risk",
    pointId: "point-1",
    timestamp: "2m ago",
    isRead: false,
  },
  {
    id: "2",
    boardId: "board-2",
    type: "support",
    userName: "Michael Torres",
    action: "supported your argument",
    pointTitle: "Decentralized systems increase resilience",
    pointId: "point-2",
    timestamp: "15m ago",
    isRead: false,
  },
  {
    id: "3",
    boardId: "board-1",
    type: "comment",
    userName: "Alex Kumar",
    action: "commented on",
    pointTitle: "Network effects create natural monopolies",
    pointId: "point-3",
    timestamp: "1h ago",
    isRead: false,
    commentPreview: "I think this overlooks the role of switching costs. Even weak network effects can become monopolistic with high switching costs.",
  },
  {
    id: "4",
    boardId: "board-2",
    type: "objection",
    userName: "Jordan Lee",
    action: "objected to",
    pointTitle: "Coordination problems require centralized solutions",
    pointId: "point-4",
    timestamp: "3h ago",
    isRead: true,
  },
  {
    id: "5",
    boardId: "board-2",
    type: "upvote",
    userName: "Taylor Park",
    action: "upvoted",
    pointTitle: "Incentive alignment is crucial for mechanism design",
    pointId: "point-5",
    timestamp: "Yesterday",
    isRead: true,
  },
  {
    id: "6",
    boardId: "board-3",
    type: "support",
    userName: "Casey Rodriguez",
    action: "supported",
    pointTitle: "Public goods need alternative funding mechanisms",
    pointId: "point-6",
    timestamp: "2d ago",
    isRead: true,
  },
];
