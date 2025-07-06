import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { withRetry } from "@/lib/utils/withRetry";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ModelConfig {
  name: string;
  rpm: number; // requests per minute
  tpm: number; // tokens per minute
  rpd: number; // requests per day
}

const MODEL_CONFIGS: ModelConfig[] = [
  {
    name: "gemini-2.0-flash",
    rpm: 15,
    tpm: 1000000,
    rpd: 1500,
  },
];

// Rate limiting tracking
const modelUsage = new Map<
  string,
  {
    requestsThisMinute: number;
    requestsToday: number;
    tokensThisMinute: number;
    lastMinuteReset: number;
    lastDayReset: number;
  }
>();

const MAX_TOKENS = 1000000; // 1 million token limit overall
const TOKENS_PER_CHAR = 0.25; // Roughly 4 characters per token

interface GeminiServiceOptions {
  preferredModel?: string;
  maxRetries?: number;
  truncateHistory?: boolean;
}

class GeminiService {
  private estimateTokens(text: string): number {
    return Math.ceil(text.length * TOKENS_PER_CHAR);
  }

  private resetRateLimits(modelName: string) {
    const now = Date.now();
    const usage = modelUsage.get(modelName);

    if (!usage) {
      modelUsage.set(modelName, {
        requestsThisMinute: 0,
        requestsToday: 0,
        tokensThisMinute: 0,
        lastMinuteReset: now,
        lastDayReset: now,
      });
      return;
    }

    // Reset minute counters if a minute has passed
    if (now - usage.lastMinuteReset >= 60000) {
      usage.requestsThisMinute = 0;
      usage.tokensThisMinute = 0;
      usage.lastMinuteReset = now;
    }

    // Reset day counters if a day has passed
    if (now - usage.lastDayReset >= 86400000) {
      usage.requestsToday = 0;
      usage.lastDayReset = now;
    }
  }

  private canUseModel(modelName: string, estimatedTokens: number): boolean {
    const config = MODEL_CONFIGS.find((c) => c.name === modelName);
    if (!config) return false;

    this.resetRateLimits(modelName);
    const usage = modelUsage.get(modelName)!;

    return (
      usage.requestsThisMinute < config.rpm &&
      usage.requestsToday < config.rpd &&
      usage.tokensThisMinute + estimatedTokens < config.tpm
    );
  }

  private recordUsage(modelName: string, tokens: number) {
    this.resetRateLimits(modelName);
    const usage = modelUsage.get(modelName)!;

    usage.requestsThisMinute++;
    usage.requestsToday++;
    usage.tokensThisMinute += tokens;
  }

  private selectBestModel(
    estimatedTokens: number,
    preferredModel?: string
  ): string {
    const modelName = "gemini-2.0-flash";

    if (!this.canUseModel(modelName, estimatedTokens)) {
      // Rate limited - will be handled by caller
      throw new Error("RATE_LIMIT_HIT");
    }

    return modelName;
  }

  private truncateMessages(
    messages: Message[],
    maxTokens: number = MAX_TOKENS * 0.7
  ): Message[] {
    const systemMessages = messages.filter((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    let totalTokens = systemMessages.reduce(
      (sum, msg) => sum + this.estimateTokens(msg.content),
      0
    );

    const userMessages = chatMessages.filter((m) => m.role === "user");
    const lastUserMessages = userMessages.slice(-2);

    for (const msg of lastUserMessages) {
      totalTokens += this.estimateTokens(msg.content);
    }

    const truncatedChatMessages: Message[] = [];

    // Add messages from most recent backwards until we hit token limit
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      const message = chatMessages[i];

      if (
        lastUserMessages.includes(message) &&
        truncatedChatMessages.length < lastUserMessages.length
      ) {
        truncatedChatMessages.unshift(message);
        continue;
      }

      const messageTokens = this.estimateTokens(message.content);

      if (totalTokens + messageTokens > maxTokens) {
        console.log(
          `Truncating chat history at ${truncatedChatMessages.length + systemMessages.length} messages to stay under ${maxTokens} tokens`
        );
        break;
      }

      totalTokens += messageTokens;
      truncatedChatMessages.unshift(message);
    }

    return [...systemMessages, ...truncatedChatMessages];
  }

  async generateStream(
    input: Message[] | string,
    options: GeminiServiceOptions = {}
  ): Promise<ReadableStream<string>> {
    const { preferredModel, maxRetries = 3, truncateHistory = true } = options;

    let prompt: string;

    if (typeof input === "string") {
      // Direct prompt string
      prompt = input;
    } else {
      // Array of messages
      const processedMessages = truncateHistory
        ? this.truncateMessages(input)
        : input;

      // Build prompt from messages
      prompt = processedMessages
        .map((m) => `${m.role.toUpperCase()}:\n${m.content}`)
        .join("\n\n");
    }

    const estimatedTokens = this.estimateTokens(prompt);

    if (estimatedTokens > MAX_TOKENS) {
      throw new Error(
        `Request exceeds maximum token limit of ${MAX_TOKENS.toLocaleString()} tokens`
      );
    }

    const selectedModel = this.selectBestModel(estimatedTokens, preferredModel);
    console.log(
      `Using model: ${selectedModel} (estimated tokens: ${estimatedTokens})`
    );

    const aiResult = await withRetry(
      async () => {
        try {
          this.recordUsage(selectedModel, estimatedTokens);

          const response = await streamText({
            model: google(selectedModel),
            prompt,
          });

          if (!response) {
            throw new Error("Failed to get response from AI model");
          }

          return response;
        } catch (error) {
          if (error instanceof Error) {
            if (error.message === "RATE_LIMIT_HIT") {
              throw new Error(
                "We've hit our rate limits for AI responses. Please wait a moment before trying again, or use the retry button to try again manually."
              );
            } else if (
              error.message.includes("rate limit") ||
              error.message.includes("overload") ||
              error.message.includes("429") ||
              error.message.includes("quota")
            ) {
              throw new Error(
                "AI service is currently busy due to high demand. Please wait a moment before trying again, or use the retry button to try again manually."
              );
            } else if (
              error.message.includes("context length") ||
              error.message.includes("token")
            ) {
              throw new Error(
                "The conversation is too long. Please start a new chat."
              );
            } else if (error.message.includes("invalid")) {
              throw new Error(
                "Invalid request format. Please try again with simpler input."
              );
            } else if (
              error.message.includes("blocked") ||
              error.message.includes("stopped")
            ) {
              throw new Error(
                "AI response was blocked due to content safety reasons."
              );
            } else if (
              error.message.includes("504") ||
              error.message.includes("timeout") ||
              error.message.includes("gateway")
            ) {
              throw new Error(
                "AI service timed out. This often happens during high load. Please use the retry button to try again."
              );
            }
          }
          throw error;
        }
      },
      { maxRetries }
    );

    const elementStream = aiResult.textStream;
    if (!elementStream) {
      throw new Error("Failed to initialize response stream");
    }

    return elementStream;
  }

  // Utility method to get current rate limit status
  getRateLimitStatus(modelName: string): {
    requestsThisMinute: number;
    requestsToday: number;
    tokensThisMinute: number;
    maxRpm: number;
    maxRpd: number;
    maxTpm: number;
  } | null {
    const config = MODEL_CONFIGS.find((c) => c.name === modelName);
    if (!config) return null;

    this.resetRateLimits(modelName);
    const usage = modelUsage.get(modelName);

    if (!usage) {
      return {
        requestsThisMinute: 0,
        requestsToday: 0,
        tokensThisMinute: 0,
        maxRpm: config.rpm,
        maxRpd: config.rpd,
        maxTpm: config.tpm,
      };
    }

    return {
      requestsThisMinute: usage.requestsThisMinute,
      requestsToday: usage.requestsToday,
      tokensThisMinute: usage.tokensThisMinute,
      maxRpm: config.rpm,
      maxRpd: config.rpd,
      maxTpm: config.tpm,
    };
  }
}

export const geminiService = new GeminiService();
export type { GeminiServiceOptions, Message };
