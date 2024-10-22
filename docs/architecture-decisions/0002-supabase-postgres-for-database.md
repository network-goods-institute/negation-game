# 1. Supabase postgres for database

Date: 2024-10-07

## Status

Accepted

## Context

In this new version of the Negation Game, we want to leverage LLMs for semantic search, summarization and suggesting new Points. While we could still use MongoDB or Firebase for that, their solutions for vector storage would probably confine us to their solutions (Atlas Vector Search/Google Cloud AI). With the fast changing AI landscape, I want to keep optionality for the future, while also having the flexibility to restructure and scale when needed.

Supabase appears to be the best solution right now:

- It offers a managed postgresql instance with the `pgvector` extension, allowing for future migration/self-hosting if needed.
- It has a free tier to get us started, and an affordable starter plan for the early days
- Postgresql is as agnostic a solution as it can be, and pgvector offers SOTA indexing techniques for embeddings similarity search [like HNSW](https://www.crunchydata.com/blog/hnsw-indexes-with-postgres-and-pgvector)
- It also offers other services which in time might come useful, like [file storage](https://supabase.com/storage) and [realtime data sync](https://supabase.com/realtime)

## Decision

We'll use Postgresql with Supabase, leveraging the `pgvector` extension to store and index embeddings for semantic search and recommendations.

## Consequences

By using a relational database, we'll have to design the schema for lightweight graph-based queries (Points and Negations, etc) so that we do not have to manage another db just fo the graph queries. Postgres seems to be enough to handle our needs of graph queries (shallow-depth ones) with acceptable performance.

We'll also need to manage db migrations and the integration of db operations in the codebase, so following up will be the decision on the tooling we'll use for that.
