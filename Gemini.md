General Rules:

YOU ARE ALWAYS WORKING IN PROD, DO NOT ADD COMMENTS OR MAKE ASSUMPTIONS ABOUT RUNNING IN DEV, ALWAYS PREPARE FOR PRODUCTION.

You are an expert in the tech stack used in this project: TypeScript, Node.js, Next.js App Router, React, Shadcn UI, Radix UI, Tailwind and Postgresql.

- Write concise, legible TypeScript code.
- Prioritize code readability; name symbols with intuitive and self-explanatory names.
- Use functional and declarative programming patterns; avoid classes.
- Prefer iteration and modularization over code duplication, but avoid premature abstractions

Do not try to run pnpm build or pnpm dev, assume the user can handle it. Do not run drizzle-kit generate or drizzle-kit migrate, assume the user can handle it.

You can run pnpm compile to run a typecheck.

We started adding tests lately, most features do not have them. But every new feature should have them added. We use jest.

Do not propose to delete tests, do not hardcode tests. Tests should be useful and dynamic to their purpose. They are meant to validate the code is working as expected.

You are not to make sql migration files directly. Simply update the schema file and I can run the migration.

If asked to edit or check a migration file you may edit it directly, make them idempotent.

If I tell you to do something, do it. Do not ask for confirmation.

You are never allowed to commit or push via github.

Make sure to avoid ambiguous sql statements. It happens a lot so be as specific as possible. Never be implicit, this is a database. Come on now.

Follow existing code style for the schema, views, and tables.

When you write raw sql to be inserted into the database to see what it's in it, make sure you return all in one row.

Additionally, use drizzle syntax for sql statements.

Stop fucking adding comments for everything.

If you find yourself going over 500 lines of code for a file, start splitting it up into smaller files.

General Negation Game Rules:
viewpoints are equivalent to rationales, rationales are the client facing name, but referred to as viewpoints internally

Epistemic System Rules:

// Restake System Rules:
// 1. Restakes are commitments to change one's mind about a parent point IF a negation is true. Restakes are placed on the negation, not the point. The point is called the parent point.
// 2. Slashes are fulfillments of that commitment - admitting the negation changed your mind. You slash a restake itself
// 3. Doubts bet on restakers following through on their commitments. You doubt all restakes on a negation that existed before you doubted it.

// Bidirectional Relationship Rules:
// 1. Each point-negation pair creates TWO separate, independent restake relationships:
//    - Point A → Point B (restakes FROM A TO B)
//    - Point B → Point A (restakes FROM B TO A)
// 2. These are completely separate systems - different restakes, doubts, slashes
// 3. When viewing Point X as a negation: show restakes FROM parent TO Point X
// 4. When viewing Point X as parent: show restakes FROM Point X TO negations
// 5. NEVER use bidirectional queries (OR clauses) - always directional (FROM parent TO negation)
// 6. Database queries must specify exact direction: WHERE point_id = parent AND negation_id = child

// Implementation Rules:
// 1. totalRestakeAmount Rules:
//    - Sum of effectiveAmount from non-fully-slashed restakes for a specific point-negation pair
//    - MUST use effective_amount, NOT amount (to handle partial slashes correctly)
//    - Used as the maximum amount that can be doubted
//    - Excludes restakes where slashedAmount >= restakeAmount
//    - Query: SELECT SUM(effective_amount) WHERE slashed_amount < amount AND point_id = X AND negation_id = Y
//    - Reduced by slashes but not by existing doubts
// 2. For restake visibility, check amount > 0 && slashedAmount < restakeAmount
// 3. Doubts are immutable once placed, can only be reduced by slashes. They can be increased though.
// 4. Hide fully slashed restakes (slashedAmount >= restakeAmount) from UI entirely
// 5. effectiveAmount = amount - slashedAmount (calculated in effectiveRestakesView)
// 6. availableForDoubts = amount > slashedAmount (boolean flag in effectiveRestakesView)

// Query Pattern Rules:
// 1. Always use effectiveRestakesView for restake calculations, never raw restakes table
// 2. When calculating totalRestakeAmount:
//    - SELECT SUM(effective_amount) FROM effective_restakes_view 
//    - WHERE slashed_amount < amount AND point_id = parent AND negation_id = child
// 3. For restake summaries by point:
//    - SELECT SUM(effective_amount) WHERE slashed_amount < amount AND point_id = target_point
// 4. Viewer-specific data must be clearly separated in query structure
// 5. Global totals must be calculated independently of viewer context
// 6. Ownership flags must be explicitly calculated using userId equality
// 7. All amounts must use COALESCE to handle NULL values consistently
// 8. Never use amount when you mean effective_amount

// Data Flow Rules:
// 1. fetchPointNegations: Shows restakes FROM parent TO each negation (unidirectional)
// 2. fetchRestakeForPoints: Shows restakes FROM specific parent TO specific negation (unidirectional)
// 3. RestakeDialog uses fetchRestakeForPoints data
// 4. PointCard uses fetchPointNegations data
// 5. Both must show identical data for consistency

// Core System Rules:
// 1. Points are arguments, negations are counterarguments
// 2. Negations alone don't change minds - restakes make that commitment
// 3. Restaking costs cred immediately but grants favor bonus to parent point
// 4. Slashing removes favor bonus and punishes doubters but costs no additional cred
// 5. Doubters bet against restakers admitting they're wrong
// 6. Multiple doubts don't stack in reducing favor (uses max(slashed, doubted))
// 7. Restakes specifically commit to changing mind about parent point endorsement
// 8. Favor bonus shows extra conviction by stating change conditions
// 9. Endorsement amount limits restake amount on parent point, cannot restake more than the endorsement amount
// 10. Endorsement reductions can and should affect existing restakes, i.e. as doubt earnings are collected it reduces from the endorsement amount

// Component Detection Rules:
// 1. PointCard:
//    - Shows current states only, for the current user
//    - Displays restake/doubt icons based on amount > 0 && slashedAmount < restakeAmount, doubtedAmount > 0
//    - Uses totalRestakeAmount for doubt possibility, i.e. the total amount of restakes on a negation that exist currently
//    - Delegates state changes to RestakeDialog
//    - Never handles transitions directly
//    - Shows filled in restake icon when user's restake exists and isn't fully slashed
//    - Shows doubt filled in icon when user's doubt amount exists
//    - Enables doubt interaction if totalRestakeAmount > 0
//    - Checks endorsement amount for restake possibility
//    - Hides restake option if no parent point endorsement when clicked, still shows the restake dialog though, just that it cannot be restaked
//    - Must use data from fetchPointNegations (directional: parent → negation)
// 2. RestakeDialog:
//    - Handles full state lifecycle
//    - Manages three modes: restaking, slashing, doubting
//    - Enforces system rules and limits
//    - Calculates state transitions and their impacts
//    - Validates all state changes
//    - Handles proportional doubt reductions on slash
//    - Enforces doubt immutability, i.e. cannot be removed, only increased
//    - Manages favor impact calculations
//    - Shows warnings for state-specific conditions
//    - Tracks endorsement reductions
//    - Handles partial slash calculations
//    - Enforces endorsement-based restake limits
//    - Shows endorsement reduction warnings
//    - Explains favor bonus mechanics
//    - Clarifies slash vs doubt implications
//    - Must use data from fetchRestakeForPoints (directional: parent → negation)

// Economic Rules:
// 1. Restaking:
//    - Costs cred immediately on placement
//    - Grants favor bonus to parent point
//    - Bonus reduced by max(slashed, doubted)
//    - Represents commitment to change mind
//    - Shows intellectual honesty by stating change conditions
//    - Can be increased after placement, but only by the user who placed it, and cannot be decreased after placement
//    - Can be slashed partially or fully
//    - Limited by parent point endorsement, cannot restake more than the endorsement amount
//    - Demonstrates extra conviction in parent point
// 2. Doubting:
//    - Bets against restaker integrity
//    - Wins if restaker doesn't slash (no real winning, just making more money than your doubt costs)
//    - Loses proportionally if restaker slashes
//    - Max amount that can be doubted is totalRestakeAmount (sum of effective_amount)
//    - Multiple doubts share proportional losses
//    - Cannot be modified even by owner, i.e. cannot be removed, only increased
//    - Forces choice between ego and integrity
// 3. Slashing:
//    - Costs no additional cred
//    - Removes favor bonus
//    - Punishes doubters proportionally (slashProportion = slashAmount / restakeAmount)
//    - Can be partial or complete
//    - Represents admission of changed mind
//    - Reduces all doubts proportionally
//    - Shows intellectual integrity
//    - Often motivated by already-lost favor from doubts

// Favor Calculation Rules:
// 1. Base favor from point/negation cred ratio
// 2. Restake bonus added to parent point
// 3. Bonus reduced by max(slashed, doubted)
// 4. Multiple doubts don't stack
// 5. Slashes permanently reduce favor of restake bonus
// 6. Favor impact immediate on restake
// 7. Favor reduced before slash if doubted
// 8. Endorsement changes can affect favor calculation
// 9. Parent point gets favor bonus from restake commitment

// State Transition Rules:
// 1. Restakes:
//    - Start with full amount and favor
//    - Can only decrease through slashing
//    - Can be increased through restaking
//    - Must respect endorsement limits
// 2. Doubts:
//    - Can be increased through doubting
//    - Only reduced by slashes
//    - Cannot be voluntarily removed, i.e. cannot be decreased, only increased
//    - Force restaker choice between ego/integrity
// 3. Slashes:
//    - Can be partial or complete
//    - Trigger doubt reductions
//    - Remove favor proportionally
//    - Cannot be undone
//    - Often motivated by doubt-reduced favor

// Incentive Structure Rules:
// 1. Intellectual Honesty:
//    - Restaking shows willingness to change mind
//    - Slashing demonstrates follow-through
//    - Doubting keeps restakers accountable
//    - Extra conviction shown through restake commitment
// 2. Economic Balance:
//    - Immediate cred cost for restaking
//    - Favor bonus as reward for honesty
//    - Doubt potential as risk factor
//    - Endorsement limits as natural constraint
// 3. Game Theory:
//    - Slashing decision balances ego vs integrity
//    - Doubt placement considers restaker history
//    - Multiple doubters share risk/reward
//    - Doubts force meaningful integrity choices

// UI Representation Rules:
// 1. Icons always present in outline form as base state
// 2. Fill state and percentages only shown for owned positions
// 3. Ownership checks must gate all personal metrics
// 4. Base styling preserved when adding state-based styles
// 5. Related UI elements (restake/doubt) share consistent styling and alignment
// 6. Base icon styling (size, stroke) must be consistent across all states
// 7. Interactive states (hover, fill) build on top of base styles
// 8. Percentages and icons must maintain vertical alignment

// Data Structure Rules:
// 1. Queries must explicitly separate:
//    - Viewer specific data (restakes, doubts owned by viewer)
//    - Global data (total amounts for favor calculation)
// 2. Ownership must be explicitly marked in database queries
// 3. Ownership flags must propagate through all transformations
// 4. Transformations must preserve ownership context through the entire stack
// 5. Data structures must include explicit ownership flags for UI consumption
// 6. effectiveRestakesView provides: amount, slashed_amount, effective_amount, available_for_doubts
// 7. Always use effective_amount for calculations involving current restake value
// 8. Use amount only when referring to original restake amount before slashing

// Earnings Collection Rules:
// 1. Doubters earn from restakers' endorsements at favor-based APY rates
// 2. APY Formula: EXP(LN(0.05) + LN(negationFavor + 0.0001))
// 3. Hourly Rate: (APY * doubtAmount) / (365 * 24)
// 4. Available Endorsement Pool: SUM(endorsements) WHERE user_id IN (restakers who existed when doubt was placed)
// 5. Earnings are capped by available endorsement pool
// 6. Endorsements are reduced proportionally by endorsement amount
// 7. Largest endorsements are reduced first (ORDER BY cred DESC)
// 8. Earnings Collection Process:
//    a. Calculate raw earnings = hourlyRate * hoursSincePayout
//    b. Cap by available endorsement pool
//    c. Group restakers by total endorsement amount
//    d. Deduct proportionally from each restaker's endorsements
//    e. Update doubt.lastEarningsAt to NOW()
//    f. Add collected amount to doubter's cred

// Slash Mechanics Rules:
// 1. Slash Proportion Formula: slashAmount / originalRestakeAmount
// 2. All doubts for the point-negation pair are reduced by slash proportion
// 3. Doubt Reduction Formula: MIN(FLOOR(doubtAmount * slashProportion), doubtAmount)
// 4. Only doubts created AFTER the restake being slashed are affected
// 5. Only doubts created BEFORE any newer restakes for same pair are affected
// 6. Slash Process:
//    a. Get all active doubts for point-negation pair in correct time window
//    b. Calculate slashProportion = slashAmount / restakeAmount
//    c. For each doubt: reductionAmount = FLOOR(doubtAmount * slashProportion)
//    d. Update doubt.amount = doubtAmount - reductionAmount
//    e. Record doubt_history with action='reduced_by_slash'
//    f. Queue notifications for affected doubters
// 7. Partial slashes reduce doubts proportionally, not by fixed amounts
// 8. Multiple slashes on same restake are cumulative

// Restake Lifecycle Rules:
// 1. Creation:
//    - Deduct cred immediately from user
//    - Create restake record with current timestamp
//    - Record restake_history with action='created'
//    - Queue restake notification
// 2. Modification (increase/decrease):
//    - Set any existing slash to 0 (deactivate slashes when restake changes)
//    - If restake was fully slashed, reset createdAt to NOW() (treat as new restake)
//    - Update amount to new value
//    - Record restake_history with appropriate action
// 3. Slashing:
//    - Create or update slash record linked to restake
//    - Reduce all qualifying doubts proportionally
//    - Record slash_history
//    - Do NOT deduct additional cred from restaker

// Doubt Lifecycle Rules:
// 1. Creation:
//    - Deduct cred immediately from doubter
//    - Create doubt record with current timestamp
//    - Set lastEarningsAt to NOW()
//    - Record doubt_history with action='created'
//    - Queue doubt notification
// 2. Increase:
//    - Collect any pending earnings first
//    - Deduct additional cred (newAmount - oldAmount)
//    - Update doubt.amount to new value
//    - Set lastEarningsAt to NOW()
//    - Record doubt_history with action='increased'
// 3. Reduction by Slash:
//    - Calculate reduction based on slash proportion
//    - Update doubt.amount = oldAmount - reductionAmount
//    - Record doubt_history with action='reduced_by_slash'
//    - Queue doubt reduction notification
// 4. Earnings Collection:
//    - Calculate earnings since lastEarningsAt
//    - Reduce restakers' endorsements proportionally
//    - Add earnings to doubter's cred
//    - Update lastEarningsAt to NOW()

// Endorsement Interaction Rules:
// 1. Restake Limits: restakeAmount <= endorsementAmount on parent point
// 2. Earnings Source: Doubts collect from restakers' endorsements only
// 3. Endorsement Reduction: Collected earnings reduce endorsements permanently
// 4. Temporal Constraints: Only endorsements that existed when doubt was placed count
// 5. Proportional Distribution: If multiple restakers, earnings deducted proportionally
// 6. Favor Impact: Reduced endorsements affect point favor calculations

// State Consistency Rules:
// 1. effectiveAmount must always equal amount - slashedAmount
// 2. availableForDoubts must always equal amount > slashedAmount
// 3. Fully slashed restakes (slashedAmount >= amount) are hidden from UI
// 4. Doubt reductions must be proportional to slash amounts
// 5. Timestamps determine eligibility for doubt/slash interactions
// 6. All cred movements must be immediate and atomic
// 7. History tables must record every state transition with before/after amounts