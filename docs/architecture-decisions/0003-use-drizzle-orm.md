# 1. Use Drizzle ORM

Date: 2024-10-07

## Status

Accepted

## Context

Since we'll be using postgres, a relational database, we better leverage some tooling to manage migrations and for better integration with the codebase.
I did try out [Kysely](https://kysely.dev/) before, but it doesn't manage migrations, and the query builder required a lot of escape-hatching to work well with the codebase typings.
[Prisma](https://www.prisma.io/) is popular, but it trades-off a lot of ease of use for wider support of db engines and such. It's better to use a lightweight solution that is straightforward and quick to use, without too much abstraction layers.

[Drizzle ORM](https://orm.drizzle.team/) is a typescript-first thin abstraction layer on top of SQL DBs that helps:

- Manage migrations (You declare your schema with typescript)
- Generate and manage types for the codebase
- build type-safe queries
- supports pgvector
- has an amazing developer experience. Pretty much plug and play

## Decision

We'll use Drizzle to manage migrations, to bootstrap the domain layer types from the db schema itself (can abstract away later, as the domain logic becomes clearer) and to build queries

## Consequences

There might be some rough edges because Drizzle is still being actively develop and some of the tooling (E.g. Drizzle Studio) is still not reliable, but the core offerings work great, and the docs are very good. The DB schema must be declared using Drizzle's APIs
