# 8. Upgrade to Gemini 2.0 Flash

Date: 2025-03-14

## Status

Accepted

## Context

We previously adopted Gemini 1.5 Flash for inference tasks as documented in [ADR-0007](./0007-gemini-for-inference.md). Google has since released Gemini 2.0 Flash, their next-generation model with improved reasoning capabilities and performance.

Key advantages of Gemini 2.0 Flash:
- Better reasoning and instruction-following
- Improved accuracy for complex inference tasks
- Similar pricing structure to Gemini 1.5 Flash
- Maintains the speed and cost advantages over GPT-4o models

For our specific use cases (identifying duplicate points, generating counterpoints, adding keywords), we benefit from the enhanced reasoning capabilities without a significant cost increase.

## Decision

We've upgraded from `gemini-flash-1.5` to `gemini-2.0-flash` for all inference tasks.

The model is referenced in code with:
```typescript
model: google("gemini-2.0-flash")
```

## Consequences

- Improved quality and accuracy of AI-assisted features
- Minimal change required in the codebase - just updating the model name
- We maintain the cost advantages over OpenAI alternatives
- We continue to benefit from Google's free tier for development purposes

We'll continue to monitor Gemini's performance in production and may make further adjustments as Google releases newer models or as our requirements evolve. 