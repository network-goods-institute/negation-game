> **Note:** The Negation Game is a work in progress and subject to change at any time.

# Introduction to the Negation Game

## What is the Negation Game?

The Negation Game is a discussion platform built on principles of epistemic accountability and honest intellectual discourse. Unlike traditional discussion platforms that rely solely on upvotes or likes, the Negation Game implements a sophisticated system of economic incentives designed to reward intellectual honesty, evidence-based reasoning, and the willingness to change one's mind when presented with compelling counterevidence.

At its core, the Negation Game is an implementation of epistocratic principles, creating a mechanism where users stake their reputation on claims and are rewarded for intellectual integrity rather than stubborn commitment to potentially false beliefs.

You can find the live site [here](https://negationgame.com).

## Key Concepts

### Points and Negations

- **Points**: These are statements or arguments that users make in the system. When you make a point, you're essentially putting forward a claim or position.

- **Negations**: These are counterarguments to points. A negation challenges a point directly, creating a paired relationship between the original point and its counterevidence.

### The Commitment Mechanism: Restakes, Slashes, and Doubts

- **Restaking**: When you endorse a point and believe in it strongly, you can "restake" on it, which is a commitment to change your mind about the point if a specific negation proves true. Restaking costs cred immediately but grants a favor bonus to the parent point, demonstrating your conviction.

- **Slashing**: If you later acknowledge that a negation has merit and changes your mind, you "slash" your restake. This is an act of intellectual honesty - fulfilling your commitment to change your mind when presented with compelling evidence. Slashing costs no additional cred but removes the favor bonus.

- **Doubting**: If you believe someone won't follow through on their restake commitment (won't change their mind even if evidence proves them wrong), you can "doubt" their restake. This is a bet against their intellectual honesty. If they never slash, you win your doubt; if they do slash, you lose proportionally.

### Cred and Favor

- **Cred**: The primary currency in the system. You spend cred to endorse points, make restakes, and place doubts.

- **Favor**: A measure of how much the community believes in a point. It's calculated based on the point/negation cred ratio and is boosted by restakes, but reduced by slashes and doubts.

### Rationales (Viewpoints)

- **Rationales**: These are structured collections of points and negations that represent complete arguments or viewpoints. They allow users to create and share comprehensive reasoning structures rather than isolated points.

## Spaces

Spaces are separate communities or contexts within the Negation Game. Each space can have its own focus, culture, and set of discussions:

- **Global Space**: The default space where all users can participate
- **Specialized Spaces**: Topic, community, or DAO-specific spaces 

Each space has its own feed of points, negations, and rationales, allowing communities to develop focused conversations around their specific interests or domains.

## How to Use the Negation Game

### Getting Started

1. **Connect your account**: Use the connect button to authenticate. You can link your wallet, email or Google Account.
2. **Explore the feed**: Browse existing points and negations in your chosen space
3. **Make a point**: Create your first statement to start participating

### Basic Interactions

- **Endorse a point**: When you see a point you agree with, you can endorse it with cred
- **Negate a point**: Create a counterargument to challenge an existing point
- **Create a rationale**: Organize multiple points into a structured argument

### Advanced Mechanisms

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

---

By participating in the Negation Game, you're joining a community dedicated to better collective reasoning, intellectual honesty, and the pursuit of truth through structured, incentive-aligned dialogue.

## Running the project locally

Negation Game is not intended to be run locally. It is a hosted service.

However, if you would like to run it locally, you can do so by following these steps:

1. Clone the repository
2. Install dependencies
3. Run the development server using `pnpm dev`

The repository makes several assumptions about the environment it's running in.

- It assumes that you have are using postgre, and privy for authentication.


## Contributing

We welcome contributions to the Negation Game! We have a rough roadmap for the project [here](https://github.com/orgs/network-goods-institute/projects/1/views/1).

Feel free to open an issue or a PR! Negation Game is being actively developed, so there are plenty of opportunities to contribute.

## License

Negation Game is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.


