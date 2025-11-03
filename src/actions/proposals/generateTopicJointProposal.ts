"use server";

import { geminiService } from "@/services/ai/geminiService";
import { getUserId } from "@/actions/users/getUserId";
import {
  analyzeTopicAlignment,
  type TopicRationaleAlignment,
} from "./analyzeTopicAlignment";import { logger } from "@/lib/logger";

export interface TopicJointProposalRequest {
  topicId: number;
  topicName: string;
  selectedDelegates: {
    userId: string;
    username: string;
    rationaleId: string;
    rationaleTitle: string;
  }[];
  existingProposal?: string;
  spaceId: string;
}

export interface ProposalDiff {
  summary: string;
  reasoning: string;
  keyAdditions: string[];
  keyModifications: string[];
  keyRemovals: string[];
}

export interface TopicJointProposalResult {
  proposal: string;
  changes?: ProposalDiff;
  alignment: TopicRationaleAlignment;
  metadata: {
    topicId: number;
    topicName: string;
    contributingRationales: {
      id: string;
      title: string;
      author: string;
    }[];
  };
}

export async function generateTopicJointProposal(
  request: TopicJointProposalRequest
): Promise<{
  textStream: ReadableStream<string>;
  proposalResult: TopicJointProposalResult;
}> {
  const viewerId = await getUserId();
  if (!viewerId) {
    throw new Error("User not authenticated");
  }

  const alignment = await analyzeTopicAlignment(
    request.topicId,
    request.topicName,
    request.selectedDelegates
  );

  const metadata = {
    topicId: request.topicId,
    topicName: request.topicName,
    contributingRationales: request.selectedDelegates.map((d) => ({
      id: d.rationaleId,
      title: d.rationaleTitle,
      author: d.username,
    })),
  };

  const delegateNames = request.selectedDelegates
    .map((d) => d.username)
    .join(", ");

  const contributingRationalesSection = request.selectedDelegates
    .map((d) => `- "${d.rationaleTitle}" by ${d.username}`)
    .join("\n");

  const sharedEndorsementsSection =
    alignment.sharedEndorsements.length > 0
      ? alignment.sharedEndorsements
          .map(
            (p) =>
              `- ${p.content} (endorsed by all delegates with average ${p.cred} cred)`
          )
          .join("\n")
      : "No points are endorsed by all selected delegates.";

  const conflictingPointsSection =
    alignment.conflictingPoints.length > 0
      ? alignment.conflictingPoints
          .map((p) => {
            const positions = p.delegatePositions
              .map(
                (dp) =>
                  `${dp.username}: ${dp.cred > 0 ? `endorses (${dp.cred} cred) from "${dp.fromRationale}"` : "does not endorse"}`
              )
              .join("\n  ");
            return `- ${p.content}\n  ${positions}`;
          })
          .join("\n\n")
      : "No conflicting points found between delegates.";

  const existingProposalSection = request.existingProposal
    ? `\nEXISTING PROPOSAL TO MODIFY:\n${request.existingProposal}\n`
    : "";

  const alignmentInfo = `Overall Alignment Score: ${(alignment.overallAlignment * 100).toFixed(1)}%`;

  const systemPrompt = `You are generating a joint proposal for the topic "${request.topicName}" based on rationales from multiple delegates.

TOPIC: ${request.topicName}

CONTRIBUTING DELEGATES: ${delegateNames}

CONTRIBUTING RATIONALES:
${contributingRationalesSection}

${alignmentInfo}

SHARED ENDORSED POINTS (build proposal foundation on these):
${sharedEndorsementsSection}

CONFLICTING POINTS (address through synthesis and compromise):
${conflictingPointsSection}${existingProposalSection}

Generate a comprehensive joint proposal for "${request.topicName}" that:

1. **Builds foundation on shared endorsed points** from all contributing rationales
2. **Synthesizes conflicting viewpoints** into balanced compromises that respect all perspectives  
3. **Represents all contributing rationales fairly** without favoring any single viewpoint
4. **Uses collaborative "we" voice** representing the delegate group
5. **Maintains focus on the topic** "${request.topicName}" throughout
6. **Creates actionable recommendations** where appropriate
${request.existingProposal ? "7. **Explains modifications** made to the existing proposal and reasoning" : ""}

${
  request.existingProposal
    ? `

When modifying the existing proposal:
- Clearly explain what changed and why
- Preserve valuable elements while incorporating new perspectives
- Show how the new version better represents the collective viewpoint

Format your response as:
1. **Executive Summary** (2-3 sentences of the main proposal)
2. **Main Proposal** (comprehensive policy/position document)
${request.existingProposal ? "3. **Changes Made** (explain modifications from original proposal)" : ""}

`
    : `

Structure as a comprehensive policy/position document with:
1. **Executive Summary** (2-3 sentences)
2. **Main Proposal** with clear sections and recommendations
3. **Conclusion** summarizing the collaborative perspective

`
}

Write in professional, collaborative language appropriate for policy documents. Be specific and actionable while maintaining diplomatic tone that respects all contributing perspectives.

IMPORTANT: This proposal represents the collective wisdom of ${request.selectedDelegates.length} delegates who have thoughtfully considered "${request.topicName}". Suggest this joint approach regardless of alignment level - even conflicting perspectives can be valuable when synthesized thoughtfully.`;

  try {
    const textStream = await geminiService.generateStream(systemPrompt, {
      truncateHistory: false,
    });

    const proposalResult: TopicJointProposalResult = {
      proposal: "",
      alignment,
      metadata,
      ...(request.existingProposal && {
        changes: {
          summary:
            "Proposal modified to incorporate multiple delegate perspectives",
          reasoning: `Integrated insights from ${request.selectedDelegates.length} rationales on ${request.topicName}`,
          keyAdditions: [],
          keyModifications: [],
          keyRemovals: [],
        },
      }),
    };

    return {
      textStream,
      proposalResult,
    };
  } catch (error) {
    logger.error("Error generating joint proposal:", error);
    throw new Error("Failed to generate joint proposal. Please try again.");
  }
}
