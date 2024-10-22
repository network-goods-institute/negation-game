# 1. OpenAI for embeddings

Date: 2024-10-07

## Status

Accepted

## Context

We need text embeddings for semantic search and for sugesting related points. I've prototyped with `text-embedding-3-small` and it seems to work well enough. I'm using Vercel's AI sdk, so it's easy enough to switch to another model later if there's need.

Since we plan on using OpenAI's LLMs for summarization, suggesting new points and such, we won't have to worry about using another provider for that.

## Decision

We'll use OpenAI's `text-embedding-3-small` for text embeddings.

## Consequences

This model is not very well placed in the [MTEB leaderboard](https://huggingface.co/spaces/mteb/leaderboard), with Google's `text-embedding-004` ranking better.
When we have enough data to benchmark different models we can consider switching. Google's model is also supported on Vercel AI sdk, so it would be easy to switch.
