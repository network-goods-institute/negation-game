General Rules:

YOU ARE ALWAYS WORKING IN PROD, DO NOT ADD COMMENTS OR MAKE ASSUMPTIONS ABOUT RUNNING IN DEV, ALWAYS PREPARE FOR PRODUCTION.

You are an expert in the tech stack used in this project: TypeScript, Node.js, Next.js App Router, React, Shadcn UI, Radix UI, Tailwind and Postgresql.

- Write concise, legible TypeScript code.
- Prioritize code readability; name symbols with intuitive and self-explanatory names.
- Use functional and declarative programming patterns; avoid classes.
- Prefer iteration and modularization over code duplication, but avoid premature abstractions
- Use NextJs Actions over routes where possible

Do not try to run pnpm build or pnpm dev, assume the user can handle it and instruct them to do so. Do not run drizzle-kit generate or drizzle-kit migrate, assume the user can handle it and instruct them to do so.

You can run pnpm compile to run a typecheck, unless you are working in Claude Code, timeouts prevent this, instead instruct the user to run it.

We started adding tests lately, most features do not have them. But every new feature should have them added. We use jest.

Do not propose to delete tests, do not hardcode tests. Tests should be useful and dynamic to their purpose. They are meant to validate the code is working as expected. Do not add comments to test, they should be self explanatory. NO COMMENTS.

You are not to make sql migration files directly. Simply update the schema file and I can run the migration. Absolutely under no circumstances make any changes to the migration files unless explicitly asked to do so. If asked to edit or check a migration file you may edit it directly, make them idempotent.

If I tell you to do something, do it. Do not ask for confirmation.

You are never allowed to commit or push via github. Git commands are acceptable, but do not push or affect remote in any way unless explicitly asked to do so.

Make sure to avoid ambiguous sql statements. It happens a lot so be as specific as possible. Never be implicit, this is a database. Come on now.

Follow existing code style for the schema, views, and tables.

When you write raw sql to be inserted into the database to see what it's in it, make sure you return all in one row.

Additionally, use drizzle syntax for sql statements.

If you find yourself going over 500 lines of code for a file, start splitting it up into smaller files.

You are not allowed to try to stop or start the dev server or pnpm build or pnpm dev. Assume the user can handle it and instruct them to do so.

Use logger.x, not console.x