# 1. Gemini for inference

Date: 2024-11-26

## Status

Accepted

## Context

I tried out gpt 4o-mini for inference tasks like selecting existing points with the same meaning (after a first-pass similarity search using embeddings) to avoid duplication. It didn't perform as well as expected, so I tried 4o standard and it worked great, but that's a 16x price increase which made it unviable (usaged by myself alone during tests make a dent on the bill, so using it would be very capital intensive).

I then did a bit of research on affordable LLMs and came to try Gemini 1.5 flash: https://x.com/volkyeth/status/1861357016490311849

Google also offers [generous free tiers](https://ai.google.dev/pricing#1_5flash) so that's another upside, besides speed and affordability.

## Decision

We'll use Google's `gemini-flash-1.5` for inference.

## Consequences

Will switch out the few places where I was using 4o-mini so we don't have to mind about multiple providers.
I also quickly evaluated Google's embeddings models and it's also worth revisiting [using openai embeddings](./0004-openai-for-embeddings%20copy.md), since Google's perform better and are more affordable too. Will do so in the near future.
