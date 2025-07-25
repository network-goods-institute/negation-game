export interface Topic {
  id: number;
  name: string;
  space: string;
  discourseUrl: string;
  restrictedRationaleCreation: boolean;
  closed: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
}

export interface Assignment {
  id: string;
  topicId: number;
  topicName: string;
  userId: string;
  promptMessage: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface TopicRationaleStatus {
  topicId: number;
  topicName: string;
  users: {
    userId: string;
    username: string;
    hasPublishedRationale: boolean;
    rationaleCount: number;
  }[];
}

export interface TopicPermission {
  userId: string;
  canCreateRationale: boolean;
}

export interface DelegateStats {
  userId: string;
  username: string;
  totalCred: number;
  pointsCreated: number;
  rationalesCreated: number;
  totalEndorsementsMade: number;
  totalCredEndorsed: number;
  pointsReceivingEndorsements: number;
  totalCredReceived: number;
  lastActive: string | null;
  joinedDate: string;
  agoraLink: string | null;
  scrollDelegateLink: string | null;
  delegationUrl: string | null;
  isDelegate: boolean;
}

export interface TopicFormData {
  name: string;
  discourseUrl: string;
  access: "open" | "whitelist" | "blacklist";
  selectedUsers: string[];
}

export interface AssignmentFormData {
  topicId: string;
  userIds: string[];
  promptMessage: string;
}

export interface CreateTopicData {
  name: string;
  space: string;
  discourseUrl: string;
  restrictedRationaleCreation: boolean;
  permissions?: { userId: string; canCreateRationale: boolean }[];
}

export interface UpdateTopicData {
  name?: string;
  discourseUrl?: string;
  restrictedRationaleCreation?: boolean;
  closed?: boolean;
  permissions?: { userId: string; canCreateRationale: boolean }[];
}

export interface CreateAssignmentData {
  topicId: number;
  targetUserId: string;
  promptMessage?: string;
}
