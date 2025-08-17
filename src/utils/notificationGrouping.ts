import { isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";

export interface NotificationGroup {
  id: string;
  title: string;
  description: string;
  count: number;
  unreadCount: number;
  icon: string;
  items: any[];
  priority: number;
}

export interface AssignmentGroup {
  id: string;
  title: string;
  description: string;
  count: number;
  spaceId: string;
  items: any[];
  priority: number;
}

export const notificationTypeLabels: Record<
  string,
  { title: string; description: string; icon: string; priority: number }
> = {
  endorsement: {
    title: "Endorsements",
    description: "Someone endorsed your points",
    icon: "👍",
    priority: 1,
  },
  negation: {
    title: "Negations",
    description: "Someone negated your points",
    icon: "⚡",
    priority: 2,
  },
  restake: {
    title: "Restakes",
    description: "Restake activity on your content",
    icon: "🎯",
    priority: 3,
  },
  doubt: {
    title: "Doubts",
    description: "Doubt activity on your restakes",
    icon: "❓",
    priority: 4,
  },
  doubt_reduction: {
    title: "Doubt Reductions",
    description: "Your doubts were reduced by slashes",
    icon: "📉",
    priority: 5,
  },
  slash: {
    title: "Slashes",
    description: "Slash activity on restakes",
    icon: "⚔️",
    priority: 6,
  },
  rationale_mention: {
    title: "Rationale Mentions",
    description: "You were mentioned in rationales",
    icon: "💬",
    priority: 7,
  },
  message: {
    title: "Messages",
    description: "New messages and replies",
    icon: "✉️",
    priority: 8,
  },
  viewpoint_published: {
    title: "Published Viewpoints",
    description: "New viewpoints were published",
    icon: "📄",
    priority: 9,
  },
  scroll_proposal: {
    title: "Scroll Proposals",
    description: "New scroll proposals",
    icon: "📜",
    priority: 10,
  },
};

export const timeGroupLabels: Record<
  string,
  { title: string; priority: number }
> = {
  today: { title: "Today", priority: 1 },
  yesterday: { title: "Yesterday", priority: 2 },
  thisWeek: { title: "This Week", priority: 3 },
  thisMonth: { title: "This Month", priority: 4 },
  older: { title: "Older", priority: 5 },
};

export function getTimeGroup(date: Date): string {
  if (isToday(date)) return "today";
  if (isYesterday(date)) return "yesterday";
  if (isThisWeek(date)) return "thisWeek";
  if (isThisMonth(date)) return "thisMonth";
  return "older";
}

export function groupNotificationsByType(
  notifications: any[]
): NotificationGroup[] {
  const grouped = notifications.reduce(
    (acc, notification) => {
      const type = notification.type;

      if (!acc[type]) {
        const typeInfo = notificationTypeLabels[type] || {
          title: type,
          description: `${type} notifications`,
          icon: "📢",
          priority: 99,
        };

        acc[type] = {
          id: type,
          title: typeInfo.title,
          description: typeInfo.description,
          icon: typeInfo.icon,
          priority: typeInfo.priority,
          count: 0,
          unreadCount: 0,
          items: [],
        };
      }

      acc[type].items.push(notification);
      acc[type].count++;
      if (!notification.readAt) {
        acc[type].unreadCount++;
      }

      return acc;
    },
    {} as Record<string, NotificationGroup>
  );

  return (Object.values(grouped) as NotificationGroup[]).sort((a, b) => {
    // Sort by unread count first (descending), then by priority (ascending)
    if (a.unreadCount !== b.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }
    return a.priority - b.priority;
  });
}

export function groupNotificationsByTime(
  notifications: any[]
): NotificationGroup[] {
  const grouped = notifications.reduce(
    (acc, notification) => {
      const timeGroup = getTimeGroup(new Date(notification.createdAt));

      if (!acc[timeGroup]) {
        const timeInfo = timeGroupLabels[timeGroup];
        acc[timeGroup] = {
          id: timeGroup,
          title: timeInfo.title,
          description: `Notifications from ${timeInfo.title.toLowerCase()}`,
          icon: "🕒",
          priority: timeInfo.priority,
          count: 0,
          unreadCount: 0,
          items: [],
        };
      }

      acc[timeGroup].items.push(notification);
      acc[timeGroup].count++;
      if (!notification.readAt) {
        acc[timeGroup].unreadCount++;
      }

      return acc;
    },
    {} as Record<string, NotificationGroup>
  );

  return (Object.values(grouped) as NotificationGroup[]).sort(
    (a, b) => a.priority - b.priority
  );
}

export function groupNotificationsBySpace(
  notifications: any[]
): NotificationGroup[] {
  const grouped = notifications.reduce(
    (acc, notification) => {
      const space = notification.space || "unknown";

      if (!acc[space]) {
        acc[space] = {
          id: space,
          title: space,
          description: `Notifications from ${space}`,
          icon: "🏠",
          priority: 1,
          count: 0,
          unreadCount: 0,
          items: [],
        };
      }

      acc[space].items.push(notification);
      acc[space].count++;
      if (!notification.readAt) {
        acc[space].unreadCount++;
      }

      return acc;
    },
    {} as Record<string, NotificationGroup>
  );

  return (Object.values(grouped) as NotificationGroup[]).sort((a, b) => {
    // Sort by unread count first (descending), then alphabetically
    if (a.unreadCount !== b.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }
    return a.title.localeCompare(b.title);
  });
}

export function groupAssignmentsBySpace(assignments: any[]): AssignmentGroup[] {
  const grouped = assignments.reduce(
    (acc, assignment) => {
      const spaceId = assignment.spaceId;

      if (!acc[spaceId]) {
        acc[spaceId] = {
          id: spaceId,
          title: spaceId,
          description: `Assignments in ${spaceId}`,
          spaceId,
          count: 0,
          items: [],
          priority: 1,
        };
      }

      acc[spaceId].items.push(assignment);
      acc[spaceId].count++;

      return acc;
    },
    {} as Record<string, AssignmentGroup>
  );

  return (Object.values(grouped) as AssignmentGroup[]).sort((a, b) => {
    // Sort by incomplete assignments first, then alphabetically
    const aIncomplete = a.items.filter((item) => !item.completed).length;
    const bIncomplete = b.items.filter((item) => !item.completed).length;

    if (aIncomplete !== bIncomplete) {
      return bIncomplete - aIncomplete;
    }
    return a.title.localeCompare(b.title);
  });
}

export function groupAssignmentsByTopic(assignments: any[]): AssignmentGroup[] {
  const grouped = assignments.reduce(
    (acc, assignment) => {
      const topicKey = `${assignment.spaceId}-${assignment.topicId}`;

      if (!acc[topicKey]) {
        acc[topicKey] = {
          id: topicKey,
          title: assignment.topicName,
          description: `${assignment.topicName} in ${assignment.spaceId}`,
          spaceId: assignment.spaceId,
          count: 0,
          items: [],
          priority: 1,
        };
      }

      acc[topicKey].items.push(assignment);
      acc[topicKey].count++;

      return acc;
    },
    {} as Record<string, AssignmentGroup>
  );

  return (Object.values(grouped) as AssignmentGroup[]).sort((a, b) => {
    // Sort by incomplete assignments first, then alphabetically
    const aIncomplete = a.items.filter((item) => !item.completed).length;
    const bIncomplete = b.items.filter((item) => !item.completed).length;

    if (aIncomplete !== bIncomplete) {
      return bIncomplete - aIncomplete;
    }
    return a.title.localeCompare(b.title);
  });
}
