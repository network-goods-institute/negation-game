"use server";

import { getDiscourseContent } from "@/actions/search/getDiscourseContent";
import { createNotification } from "@/actions/notifications/createNotification";
import { notificationPreferencesTable, notificationsTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq, and, gte } from "drizzle-orm";

const SCROLL_FORUM_URL = "https://forum.scroll.io";
const GOVERNANCE_KEYWORDS = [
  "proposal",
  "vote",
  "voting",
  "governance",
  "SIP", // Scroll Improvement Proposal
  "treasury",
  "grant",
  "funding",
  "budget",
  "dao",
  "snapshot",
  "delegation",
  "delegate",
];

interface DiscoursePost {
  id: number;
  title: string;
  excerpt: string;
  created_at: string;
  category_id: number;
  tags?: string[];
  topic_id: number;
}

interface DiscourseResponse {
  topic_list: {
    topics: DiscoursePost[];
  };
}

/**
 * Fetch recent posts from Scroll forum and detect governance proposals
 * This should be called periodically (e.g., via cron job)
 */
export const detectScrollProposals = async (): Promise<void> => {
  try {
    // Fetch recent topics from Scroll forum
    const response = await fetch(`${SCROLL_FORUM_URL}/latest.json`);
    if (!response.ok) {
      console.error("Failed to fetch from Scroll forum:", response.status);
      return;
    }

    const data: DiscourseResponse = await response.json();
    const topics = data.topic_list?.topics || [];

    const governanceTopics = topics.filter((topic) => {
      const titleLower = topic.title.toLowerCase();
      const excerptLower = (topic.excerpt || "").toLowerCase();
      const tagsLower = (topic.tags || []).join(" ").toLowerCase();

      const searchText = `${titleLower} ${excerptLower} ${tagsLower}`;

      return GOVERNANCE_KEYWORDS.some((keyword) =>
        searchText.includes(keyword.toLowerCase())
      );
    });

    const interestedUsers = await db
      .select({ userId: notificationPreferencesTable.userId })
      .from(notificationPreferencesTable)
      .where(
        eq(notificationPreferencesTable.scrollProposalNotifications, true)
      );

    for (const topic of governanceTopics) {
      // Check if we've EVER notified about this proposal (no time limit)
      const existingNotifications = await db
        .select()
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.type, "scroll_proposal"),
            eq(notificationsTable.sourceEntityId, topic.id.toString())
          )
        )
        .limit(1);

      if (existingNotifications.length > 0) {
        // Skip this topic - we've already notified users about it
        continue;
      }

      const topicUrl = `${SCROLL_FORUM_URL}/t/${topic.topic_id}`;
      const fullContent = await getDiscourseContent(topicUrl);

      for (const user of interestedUsers) {
        await createNotification({
          userId: user.userId,
          type: "scroll_proposal",
          sourceEntityId: topic.id.toString(),
          sourceEntityType: "proposal",
          title: `New Scroll Governance: ${topic.title}`,
          content:
            topic.excerpt ||
            "A new governance-related post has been detected on the Scroll forum.",
          space: "scroll",
          metadata: {
            discourseUrl: topicUrl,
            forumTitle: topic.title,
            forumExcerpt: topic.excerpt,
            categoryId: topic.category_id,
            tags: topic.tags,
            topicId: topic.topic_id,
            fullContent: fullContent?.substring(0, 1000), // Truncate for metadata
          },
        });
      }

      console.log(
        `Notified ${interestedUsers.length} users about Scroll proposal: ${topic.title}`
      );
    }

    console.log(
      `Processed ${governanceTopics.length} governance topics from Scroll forum`
    );
  } catch (error) {
    console.error("Error detecting Scroll proposals:", error);
  }
};
