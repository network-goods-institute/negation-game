> **Note:** The Negation Game is a work in progress and subject to change at any time.

# Introduction to the Negation Game

## What is the Negation Game?

> A protocol layer for reasoned disagreement: powered by economic incentives, governed by epistemic values, and designed for minds willing to change.

The Negation Game is a discussion platform built on principles of epistemic accountability and honest intellectual discourse. Unlike traditional discussion platforms that rely solely on upvotes or likes, the Negation Game implements a sophisticated system of economic incentives designed to reward intellectual honesty, evidence-based reasoning, and the willingness to change one's mind when presented with compelling counterevidence.

At its core, the Negation Game is an implementation of epistocratic principles, creating a mechanism where users stake their reputation on claims and are rewarded for intellectual integrity rather than stubborn commitment to potentially false beliefs.

You can find the live site [here](https://negationgame.com).

## Key Concepts

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

However, if you would like to attempt to run it locally, you can do so by following these steps:

1. Clone the repository
2. Install dependencies `pnpm i`
3. Run the development server using `pnpm dev`

The repository makes several assumptions about the environment it's running in.

- It assumes that you are using postgre, [privy](https://docs.privy.io/authentication/overview) for authentication, as well as Gemini and OpenAI for AI features.

### Running the Yjs websocket server

The Negation Game uses Yjs for collaborative editing. The Yjs websocket server is hosted on Fly.io.

`cd yjs-ws && ALLOWED_ORIGINS=http://localhost:3001 VERBOSE=1 node server.js` is for local development.



## Contributing

We welcome contributions to the Negation Game! We have a rough roadmap for the project [here](https://github.com/orgs/network-goods-institute/projects/1/views/1).

Feel free to open an issue or a PR! Negation Game is being actively developed, so there are plenty of opportunities to contribute.

## License

Negation Game is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
