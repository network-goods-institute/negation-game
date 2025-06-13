import { geminiService, type Message } from "../geminiService";

// Mock the dependencies
jest.mock("@ai-sdk/google", () => ({
  google: jest.fn(),
}));

jest.mock("ai", () => ({
  streamText: jest.fn(),
}));

jest.mock("@/lib/utils/withRetry", () => ({
  withRetry: jest.fn(),
}));

// Get the mocked functions
const { google } = require("@ai-sdk/google");
const { streamText } = require("ai");
const { withRetry } = require("@/lib/utils/withRetry");

describe("GeminiService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    withRetry.mockImplementation(async (fn: any) => fn());
    google.mockReturnValue("mocked-gemini-model");
    streamText.mockResolvedValue({
      textStream: new ReadableStream(),
    });
  });

  describe("model selection", () => {
    it("should use gemini-2.0-flash model", async () => {
      const prompt = "Test prompt";

      await geminiService.generateStream(prompt);

      expect(streamText).toHaveBeenCalledWith({
        model: expect.anything(),
        prompt,
      });
    });

    it("should handle rate limits with helpful message", async () => {
      streamText.mockRejectedValue(new Error("rate limit exceeded"));

      await expect(geminiService.generateStream("Test prompt")).rejects.toThrow(
        "AI service is currently busy due to high demand"
      );
    });
  });

  describe("error handling", () => {
    it("should handle token limit exceeded", async () => {
      const veryLongPrompt = "x".repeat(5000000); // 5M characters

      await expect(
        geminiService.generateStream(veryLongPrompt)
      ).rejects.toThrow("Request exceeds maximum token limit");
    });

    it("should handle context length errors", async () => {
      streamText.mockRejectedValue(new Error("context length exceeded"));

      await expect(geminiService.generateStream("Test prompt")).rejects.toThrow(
        "The conversation is too long"
      );
    });

    it("should handle blocked content errors", async () => {
      streamText.mockRejectedValue(new Error("response blocked"));

      await expect(geminiService.generateStream("Test prompt")).rejects.toThrow(
        "AI response was blocked due to content safety reasons"
      );
    });

    it("should handle 504 timeout errors", async () => {
      streamText.mockRejectedValue(new Error("504 gateway timeout"));

      await expect(geminiService.generateStream("Test prompt")).rejects.toThrow(
        "AI service timed out"
      );
    });

    it("should handle quota exceeded errors", async () => {
      streamText.mockRejectedValue(new Error("quota exceeded"));

      await expect(geminiService.generateStream("Test prompt")).rejects.toThrow(
        "AI service is currently busy due to high demand"
      );
    });
  });

  describe("input formats", () => {
    it("should handle string prompts", async () => {
      const prompt = "Direct string prompt";

      await geminiService.generateStream(prompt);

      expect(streamText).toHaveBeenCalledWith({
        model: expect.anything(),
        prompt,
      });
    });

    it("should handle message arrays", async () => {
      const messages: Message[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
        { role: "user", content: "How are you?" },
      ];

      await geminiService.generateStream(messages);

      expect(streamText).toHaveBeenCalledWith({
        model: expect.anything(),
        prompt: "USER:\nHello\n\nASSISTANT:\nHi there\n\nUSER:\nHow are you?",
      });
    });
  });

  describe("rate limit tracking", () => {
    it("should track rate limits for gemini-2.0-flash", () => {
      const status = geminiService.getRateLimitStatus("gemini-2.0-flash");

      expect(status).toBeDefined();
      expect(status?.maxRpm).toBe(15);
      expect(status?.maxTpm).toBe(1000000);
      expect(status?.maxRpd).toBe(1500);
    });

    it("should return null for unknown models", () => {
      const status = geminiService.getRateLimitStatus("unknown-model");

      expect(status).toBeNull();
    });
  });

  describe("message truncation", () => {
    it("should truncate long message arrays", () => {
      const service = geminiService as any;

      const longMessages: Message[] = Array.from({ length: 100 }, (_, i) => ({
        role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
        content: "x".repeat(10000),
      }));

      const truncated = service.truncateMessages(longMessages, 50000);

      expect(truncated.length).toBeLessThan(longMessages.length);
      expect(truncated.length).toBeGreaterThan(0);
    });

    it("should preserve system messages during truncation", () => {
      const service = geminiService as any;

      const messages: Message[] = [
        { role: "system", content: "Important system message" },
        ...Array.from({ length: 50 }, (_, i) => ({
          role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
          content: "x".repeat(5000),
        })),
      ];

      const truncated = service.truncateMessages(messages, 20000);

      const systemMessage = truncated.find((m: Message) => m.role === "system");
      expect(systemMessage).toBeDefined();
      expect(systemMessage?.content).toBe("Important system message");
    });

    it("should preserve the last user message", () => {
      const service = geminiService as any;

      const messages: Message[] = [
        { role: "user", content: "First user message" },
        { role: "assistant", content: "x".repeat(10000) },
        { role: "user", content: "Last user message" },
      ];

      const truncated = service.truncateMessages(messages, 5000);

      const lastUserMessage = truncated
        .filter((m: Message) => m.role === "user")
        .pop();
      expect(lastUserMessage?.content).toBe("Last user message");
    });
  });
});
