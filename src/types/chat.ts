export interface DiscourseMessage {
  id: number;
  content: string;
  raw: string;
  created_at: string;
  topic_id?: number;
  topic_title?: string;
  space: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  sources?: Array<{ type: string; id: string | number }>;
}

export interface SavedChat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  space: string;
}

export interface ChatRationale {
  id: string;
  title: string;
  description: string;
  author: string;
  graph: {
    nodes: Array<{
      id: string;
      type: "point" | "statement" | "addPoint";
      data: {
        content?: string;
        statement?: string;
        pointId?: number;
      };
    }>;
    edges: Array<{
      id: string;
      type: string;
      source: string;
      target: string;
    }>;
  };
  statistics: {
    views: number;
    copies: number;
    totalCred: number;
    averageFavor: number;
  };
}

export interface ChatSettings {
  includeEndorsements: boolean;
  includeRationales: boolean;
  includePoints: boolean;
  includeDiscourseMessages: boolean;
}

export type DiscourseConnectionStatus =
  | "disconnected"
  | "connected"
  | "partially_connected"
  | "pending"
  | "unavailable_logged_out";

export type InitialOption = "distill" | "build" | null;
