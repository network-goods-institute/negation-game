> **Note:** The Negation Game is a work in progress and subject to change at any time.

# Introduction to the Negation Game

## What is the Negation Game?

> A protocol layer for reasoned disagreement: powered by economic incentives, governed by epistemic values, and designed for minds willing to change.

The Negation Game is a discussion platform built on principles of epistemic accountability and honest intellectual discourse. Unlike traditional discussion platforms that rely solely on upvotes or likes, the Negation Game implements a sophisticated system of economic incentives designed to reward intellectual honesty, evidence-based reasoning, and the willingness to change one's mind when presented with compelling counterevidence.

At its core, the Negation Game is an implementation of epistocratic principles, creating a mechanism where users stake their reputation on claims and are rewarded for intellectual integrity rather than stubborn commitment to potentially false beliefs.

You can find the live site [here](https://negationgame.com).

## Multiplayer Boards

In addition to the core Negation Game, we've built **Multiplayer Boards (MP Boards)**, a real-time collaborative argument mapping tool.

MP Boards let teams build structured arguments together with:
- **Real-time collaboration**: Multiple editors with live cursors and conflict-free syncing (Yjs CRDT)
- **Graph structure**: Nodes (points, statements, questions) connected by edges (support, negation, objection)
- **Discussion features**: Comments, upvotes, and notifications
- **Flexible sharing**: Public/private boards with shareable links

**Important**: MP boards are a separate product from the legacy Negation Game. They don't use Cred, Favor, Restakes, or any economic mechanics from Legacy Negation Game, they're pure collaboration tools for building arguments.

See [docs/experiment-multiplayer.md](docs/experiment-multiplayer.md) for architecture details.

### Terminology

- **MP Boards / Multiplayer**: Real-time collaborative boards (the experiment product)
- **Legacy**: The original Negation Game with Cred, Favor, and economic mechanics
- **Board**: A multiplayer document containing nodes, edges, comments, and metadata
- **Node**: A point, statement, question, or comment in an MP board
- **Edge**: A relationship between nodes (support, negation, objection)
- **Point**: Can refer to either a legacy game point OR an MP board node (context-dependent)
- **Cred**: Legacy game currency for staking on points
- **Favor**: Legacy game metric for community belief in a point
- **Restake/Slash/Doubt**: Legacy game commitment mechanisms (not used in MP boards)

---

## Key Concepts (Legacy Negation Game)

### Points and Negations

- **Points**: These are statements or arguments that users make in the system. When you make a point, you're essentially putting forward a claim or position.

- **Negations**: These are counterarguments to points. A negation challenges a point directly, creating a paired relationship between the original point and its counterevidence. You can endorse your negation while creating it.

### Cred and Favor

- **Cred**: The primary resource in the system. Each user starts with a fixed allocation of Cred, which acts like a delegation power. You spend Cred to endorse Points and place Doubts; Restakes and Slashes do not cost additional Cred. When you Doubt, your earnings accumulate passively from the favor bonus until the Restaker Slashes, which cuts off further earnings. Use the "Collect Earnings" button in your profile to redeem any accumulated earnings. You must check in on it regularly to collect your earnings or you may miss out if the Restaker Slashes.

- **Favor**: A measure of how much the community believes in a Point. It's calculated based on the point/negation Cred ratio and is boosted by Restakes, but reduced by Slashes and Doubts.

### Rationales

- **Rationales**: These are structured collections of Points and Negations that represent complete arguments. They allow users to create and share comprehensive reasoning structures rather than isolated points.

### Spaces

Spaces are separate communities or contexts within the Negation Game. Each space can have its own focus, culture, and set of discussions:

- **Global Space**: The default space where all users can participate
- **Specialized Spaces**: Topic, community, or DAO-specific spaces

Each space has its own feed of Points, Negations, and Rationales, allowing communities to develop focused conversations around their specific interests or domains.

## Advanced Mechanisms

### The Commitment Mechanism: Restakes, Slashes, and Doubts

**Restaking**, **Slashing**, and **Doubting** form the system's commitment mechanisms with distinct Cred implications:

- **Restaking**: Commit to reconsider your endorsement if a specific negation proves true. Restaking does not cost additional Cred; it allocates a portion of your existing Cred endorsed to the parent Point and grants a favor bonus to the parent Point. This bonus is at risk and can be claimed by Doubters until you Slash.
- **Slashing**: Fulfill your Restake commitment by acknowledging the negation changed your mind. Slashing costs no additional Cred, removes the favor bonus, and you earn Cred based on the conditions you committed to.
- **Doubting**: Bet against a Restaker's likelihood of Slashing. Doubting costs Cred to place; if the Restaker does not Slash when expected, you win your Doubt and earn Cred, redeemable via the "Collect Earnings" button. If they Slash, you lose your Doubted Cred.

## How to Use the Negation Game

### Getting Started

1. **Connect your account**: Use the connect button to authenticate. You can link your wallet, email, Google Account, or Farcaster.
2. **Explore the feed**: Browse existing points and negations in your chosen space. Use the search feature to find specific content.
3. **Make a point**: Create your first statement to start participating
4. **Use the AI Assistant**: Navigate to the Chat tab to ask questions, generate points, and explore rationales with the built-in AI Assistant.

### Basic Interactions

- **Endorse a point**: When you see a Point you agree with, you can endorse it with Cred
- **Negate a point**: Create a counterargument to challenge an existing Point
- **Create a rationale**: Organize multiple Points and Negations into a structured argument

### Complex Interactions

- **Restake on a point**: Show your conviction by committing to change your mind if a negation proves true
- **Slash your restake**: Acknowledge when a negation has changed your mind
- **Doubt a restake**: Challenge someone's commitment to intellectual honesty

## The Economic Game

The Negation Game creates a system where:

1. Making strong claims without evidence is risky
2. Being willing to change your mind is rewarded
3. Intellectual honesty has real economic benefits
4. Deep, evidence-based discussions are incentivized

By aligning economic incentives with epistemic values, the Negation Game creates an environment where the truth-seeking process itself becomes the core activity, rather than merely winning arguments.

## Theoretical Foundations

The Negation Game implements principles from epistocracy, which improves upon futarchy by:

1. Integrating information dissemination directly into the market mechanism
2. Making the reasons for beliefs transparent and disputable
3. Creating economic incentives for revealing information that might falsify your own position
4. Establishing a recursive system where claims can be examined at increasing levels of nuance
5. Rewarding those who demonstrate willingness to change their minds based on evidence

The result is a discussion platform where the quality of your reasoning and your intellectual integrity matter more than merely holding popular opinions or having the most followers.

By participating in the Negation Game, you're joining a community dedicated to better collective reasoning, intellectual honesty, and the pursuit of truth through structured, incentive-aligned dialogue.

## Running the project locally

Negation Game is not intended to be run locally. It is a hosted service.

However, if you would like to attempt to run it locally or do local development, you can do so by following these steps:

> **Warning**: These instructions may be incomplete or outdated. If you encounter issues or notice any inaccuracies, please open a PR with corrections.

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20 or higher recommended)
- **pnpm** (v9.15.4 or higher) - Install with: `npm install -g pnpm`
- **PostgreSQL** database (or use a hosted service like Supabase (recommended))

### 1. Clone the repository

```bash
git clone https://github.com/network-goods-institute/negation-game.git
cd negation-game
```

### 2. Install dependencies and other setup

```bash
./scripts/init-submodules.js
pnpm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Required: Database (we use drizzle, so use the drizzle orm connection string from suapbase to make this easier)
POSTGRES_URL="postgresql://user:password@host:port/database"

# Required: Authentication (Privy)
NEXT_PUBLIC_PRIVY_APP_ID="your-privy-app-id"
PRIVY_APP_SECRET="your-privy-app-secret"

# Required: AI Features
OPENAI_API_KEY="your-openai-api-key"
GOOGLE_GENERATIVE_AI_API_KEY="your-google-ai-api-key"

# Required: Yjs WebSocket for collaborative editing
NEXT_PUBLIC_YJS_WS_URL="ws://localhost:8080"
YJS_AUTH_SECRET="generate-a-random-secret-key"

# Optional: Feature Flags
# Core Features
NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED=true  # Enable/disable multiplayer collaborative boards (default: false)
NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED=false      # Enable/disable prediction market features (default: false)
NEXT_PUBLIC_FEATURE_NOTIFICATIONS_ENABLED=true   # Enable/disable notifications system (default: true)
NEXT_PUBLIC_FEATURE_PINNED_AND_PRIORITY=false    # Enable/disable pinned and priority points (default: false)

# Performance & Behavior
NEXT_PUBLIC_ENABLE_LOGS=false                    # Enable client-side logging in production (default: false, always enabled in dev)
NEXT_PUBLIC_MULTIPLAYER_DISCONNECT_GRACE_MS=4000 # Milliseconds before showing disconnect warning (default: 4000)

# Deployment (usually set automatically)
NEXT_PUBLIC_DOMAIN="negationgame.com"            # Domain for SEO/sitemap generation (default: negationgame.com)

# Optional: Development
ESLINT_USE_FLAT_CONFIG=false

# Avatars (Supabase storage)
SUPABASE_URL="https://<your-project>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

**Getting the required credentials:**

- **PostgreSQL**: Set up a PostgreSQL database locally or use a hosted service like [Supabase](https://supabase.com)
- **Privy**: Sign up at [Privy.io](https://privy.io) and create an app to get your credentials
- **OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Google AI**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Supabase**: From your project settings → API, copy the `SUPABASE_URL` and `service_role` key.

**Understanding the feature flags:**

- **`NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED`**: Enables the multiplayer rationale experiment with real-time collaborative editing using Yjs CRDT. When enabled, users can create collaborative boards with live cursors, presence indicators, and conflict-free editing. Requires the Yjs WebSocket server to be running.

- **`NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED`**: Activates prediction market features for nodes and edges, including price tracking, holdings, share trading, and market overlays. When disabled, market-related UI components and API endpoints are hidden. Requires additional git submodules - see `scripts/init-submodules.js`.

- **`NEXT_PUBLIC_FEATURE_NOTIFICATIONS_ENABLED`**: Controls the notification system for multiplayer boards. When enabled (default), users receive notifications for negations, objections, supports, upvotes, and comments on their points. Notifications appear in the sidebar and can be marked as read.

- **`NEXT_PUBLIC_FEATURE_PINNED_AND_PRIORITY`**: Enables moderators to pin specific points to the top of feeds and mark points as priority. Useful for highlighting important discussions or announcements in specific spaces.

- **`NEXT_PUBLIC_ENABLE_LOGS`**: Forces client-side console logging in production environments. By default, browser console logs are only shown in development mode, but server-side logs always appear regardless of environment.

- **`NEXT_PUBLIC_MULTIPLAYER_DISCONNECT_GRACE_MS`**: Sets the delay (in milliseconds) before showing a disconnection warning in multiplayer sessions. Prevents false warnings from brief network hiccups.

### 4. Set up the database

Enable PGVector extension in your database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

(or project dashboard -> database -> extensions -> vector) if you run into permissions issues.

Run database migrations using Drizzle:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

Create the Supabase storage bucket for avatars (one-time in Supabase):

- Bucket name: `profile-pictures`
- Public read enabled; writes are done via the server (service role key).

### 5. Set up the Yjs WebSocket server

The Negation Game Multiplayer Experiment uses Yjs for collaborative editing. You need to run a separate WebSocket server:

```bash
# In a new terminal window
cd yjs-ws
pnpm install
pnpm dev
```

This will start the Yjs WebSocket server on `wss://localhost:8080`.

### 6. Run the development server

```bash
# In your main terminal (in the root directory)
pnpm dev
```

The application will be available at `http://localhost:3001`.

### Development Commands

**Core Commands:**
```bash
pnpm dev              # Start dev server on http://localhost:3001
pnpm dev-turbo        # Start with Next.js Turbopack (faster builds)
pnpm build            # Production build (auto-runs init-submodules.js for market experiment)
pnpm start            # Start production server
```

**Code Quality:**
```bash
pnpm lint             # Run ESLint
pnpm compile          # TypeScript type check (no output files)
pnpm test             # Run all Jest tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Generate test coverage report
pnpm test:mp-e2e      # Run multiplayer end-to-end tests
```

**Validation:**
```bash
pnpm smoke-test       # Quick validation: lint + compile + test
pnpm validate         # Full validation: smoke-test + build
```

**Database Management:**
```bash
pnpm drizzle-kit generate   # Generate new migration from schema changes
pnpm drizzle-kit migrate    # Run migration files
pnpm drizzle-kit push       # Push schema directly to database (faster for dev)
pnpm drizzle-kit studio     # Open Drizzle Studio (database GUI)
pnpm dump-db                # Backup database to file
pnpm restore-db             # Restore database from backup
pnpm clone-db               # Clone database to new instance
```

**Space Management (Legacy Game):**
```bash
pnpm list-spaces      # List all spaces in the system
pnpm update-spaces    # Update spaces metadata
pnpm clone-space      # Clone a space with all its data
```

**Important Notes:**
- Database schema changes: Edit `src/db/schema.ts`, then run `pnpm drizzle-kit generate`
- Never edit migration files in `src/db/migrations/` directly unless explicitly needed
- `pnpm build` automatically runs `scripts/init-submodules.js` to initialize market experiment submodules

### Troubleshooting

**Database Issues:**
- **Connection errors**: Verify `POSTGRES_URL` format and credentials are correct
- **Migration errors**: Check that PGVector extension is enabled (`CREATE EXTENSION IF NOT EXISTS vector`)
- **Schema drift**: Run `pnpm drizzle-kit push` to sync your schema to the database

**Multiplayer Issues:**
- **No real-time sync**: Ensure Yjs WebSocket server is running on port 8080
- **Disconnect warnings**: Check `NEXT_PUBLIC_YJS_WS_URL` matches your Yjs server URL
- **Write access conflicts**: Only one session per user can write; others are read-only until they gain write access

**Authentication Issues:**
- **Login fails**: Double-check `NEXT_PUBLIC_PRIVY_APP_ID` and `PRIVY_APP_SECRET`
- **Anonymous users**: Only allowed in non-production when authentication is disabled

**Build Issues:**
- **Market submodule missing**: Run `pnpm build` to auto-initialize via `init-submodules.js`
- **Port conflicts**: The app uses port 3001 (not the default 3000)
- **Out of memory**: Try `pnpm dev-turbo` for faster builds with less memory usage

**General:**
- Make sure both the main app (port 3001) and Yjs server (port 8080) are running simultaneously for MP Boards
- Check the console for specific error messages and stack traces

### Development Notes

- The main Next.js app runs on port **3001** (not the default 3000)
- The Yjs WebSocket server runs on port **8080**
- Database schema changes should be made in `src/db/schema.ts`, then generate migrations with `drizzle-kit`
- Never edit migration files directly unless explicitly needed

---

## Project Structure

```
negation-game/
├── src/
│   ├── app/                              # Next.js App Router pages
│   │   ├── s/[space]/                    # Legacy: Spaces, points, feeds, rationales
│   │   ├── experiment/rationale/multiplayer/  # MP Boards app routes
│   │   ├── profile/[username]/           # User profiles
│   │   ├── board/[id]/                   # Legacy board viewer
│   │   ├── notifications/                # Notification pages
│   │   ├── settings/                     # User settings
│   │   ├── admin/                        # Admin panel
│   │   └── api/                          # API routes
│   │       ├── experimental/rationales/  # MP board CRUD & Yjs sync
│   │       ├── market/                   # Market experiment APIs
│   │       ├── yjs/                      # Yjs auth tokens
│   │       ├── points/, endorsements/, restakes/  # Legacy game APIs
│   │       └── ai/, chat/, search/       # AI & search APIs
│   │
│   ├── components/
│   │   ├── experiment/multiplayer/       # MP Boards (~70 files)
│   │   │   ├── GraphCanvas.tsx           # React Flow canvas
│   │   │   ├── *Node.tsx                 # Point, Statement, Title, Group, Objection, Comment nodes
│   │   │   ├── *Edge.tsx                 # Support, Negation, Objection, Statement edges
│   │   │   ├── notifications/            # NotificationsSidebar, NotificationsPanel
│   │   │   ├── market/                   # Market overlays & trading UI
│   │   │   └── common/                   # Shared MP board utilities
│   │   ├── points/                       # Legacy point cards & interactions
│   │   ├── rationale/                    # Legacy rationale components
│   │   ├── editor/                       # Rich text editors
│   │   ├── dialogs/                      # Modal dialogs
│   │   ├── auth/                         # Authentication UI
│   │   ├── header/, notifications/, settings/
│   │   └── ui/                           # Shadcn UI components
│   │
│   ├── actions/                          # Next.js Server Actions
│   │   ├── experiment/                   # MP board actions (CRUD, permissions)
│   │   ├── experimental/                 # Experimental features
│   │   ├── points/, endorsements/, restakes/  # Legacy game actions
│   │   ├── market/                       # Market trading actions
│   │   ├── ai/, chat/                    # AI & chat actions
│   │   └── users/, spaces/, feed/        # User & space management
│   │
│   ├── hooks/                            # React hooks
│   │   ├── experiment/multiplayer/       # MP board hooks
│   │   │   ├── yjs/                      # Yjs sync, hydration, undo/redo
│   │   │   ├── useYjsMultiplayer.ts      # Main multiplayer orchestration
│   │   │   ├── useGraphOperations.ts     # Graph mutation helpers
│   │   │   └── useWriteAccess.ts         # Write permission arbitration
│   │   ├── market/                       # Market hooks (useMarket, useTrade)
│   │   └── [various feature hooks]
│   │
│   ├── queries/                          # TanStack Query hooks
│   │   ├── experiment/multiplayer/       # MP board queries
│   │   ├── points/, endorsements/, restakes/  # Legacy game queries
│   │   ├── market/                       # Market data queries
│   │   └── users/, spaces/               # User & space queries
│   │
│   ├── mutations/                        # TanStack Query mutations
│   │   └── [feature mutations]
│   │
│   ├── utils/                            # Utility functions
│   │   ├── experiment/multiplayer/       # MP board utilities
│   │   │   ├── graphSync.ts              # React Flow ↔ Yjs sync
│   │   │   ├── graphOperations/          # Node/edge CRUD operations
│   │   │   └── notificationRouting.ts    # Notification helpers
│   │   ├── market/                       # Market utilities
│   │   ├── points/, endorsements/        # Legacy game utilities
│   │   └── [shared utilities]
│   │
│   ├── db/                               # Database
│   │   ├── schema.ts                     # Main Drizzle schema (imports all tables)
│   │   ├── migrations/                   # Auto-generated SQL migrations
│   │   ├── tables/                       # Table definitions
│   │   │   ├── mpDocsTable.ts            # MP board metadata
│   │   │   ├── mpNotificationsTable.ts   # MP board notifications
│   │   │   ├── pointsTable.ts            # Legacy points
│   │   │   └── [50+ table files]
│   │   └── views/                        # Database views
│   │
│   ├── lib/                              # Libraries & integrations
│   │   ├── carroll/                      # Market maker (git submodule)
│   │   ├── ai/                           # OpenAI, Google AI clients
│   │   ├── privy/                        # Privy auth helpers
│   │   ├── featureFlags.ts               # Feature flag definitions
│   │   └── logger.ts                     # Custom logger
│   │
│   ├── atoms/                            # Jotai state atoms
│   ├── constants/                        # App constants
│   ├── data/                             # Static data & sample data
│   ├── services/                         # External service integrations
│   ├── types/                            # TypeScript types
│   ├── workers/                          # Web workers
│   ├── middleware.ts                     # Next.js middleware
│   └── __tests__/                        # Top-level integration tests
│
├── docs/
│   ├── experiment-multiplayer.md         # MP Boards architecture (OUTDATED)
│   ├── architecture-decisions/           # ADR records (12 decisions)
│   └── embeds/                           # Embed documentation
│
├── scripts/                              # Dev & deployment scripts
│   ├── init-submodules.js                # Auto-init market submodules
│   ├── clone-space.ts, update-spaces.ts  # Space management
│   └── dump-db.sh, restore-db.sh         # Database backup/restore
│
├── yjs-ws/                               # Yjs WebSocket server (git submodule)
├── discourse/                            # Discourse forum (git submodule, unrelated)
└── public/                               # Static assets
```

### Git Submodules

This project uses git submodules for certain dependencies:

- **`src/lib/carroll/`**: Market maker implementation for prediction markets. **Note**: This submodule is currently private and not publicly available. It contains the automated market maker logic used by the `NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED` feature. Access to this submodule requires special permissions. Although attempting to run the build script will work fine if you do not have access, it will simply use stubs.

- **`yjs-ws/`**: Yjs WebSocket server for real-time collaborative editing. This is publicly available and handles the multiplayer synchronization for MP Boards.

- **`discourse/`**: Discourse forum integration (unrelated to core functionality).

To initialize all submodules after cloning:

```bash
./scripts/init-submodules.js
```

This script handles submodule initialization and any required post-setup steps, particularly for the market experiment dependencies.

---

## Documentation

- **[Multiplayer Architecture](docs/experiment-multiplayer.md)** - Detailed MP Boards system design and file map
- **[Architecture Decisions](docs/architecture-decisions/)** - ADR records for key technical choices
- **[Yjs WebSocket Setup](yjs-ws/README.md)** - WebSocket server deployment guide

---

## Contributing

We welcome contributions to the Negation Game! We have two roadmaps for the project [here](https://github.com/orgs/network-goods-institute/projects/1/views/1) and [here](https://github.com/orgs/network-goods-institute/projects/3).

Feel free to open an issue or a PR! Negation Game is being actively developed, so there are plenty of opportunities to contribute.

## License

Negation Game is dual-licensed:
- **AGPL-3.0** for open-source use - See [LICENSE-AGPL.md](LICENSE-AGPL.md)
- **Commercial License** available - See [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md)
