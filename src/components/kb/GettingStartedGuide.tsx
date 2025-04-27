export const GettingStartedGuide = () => {
    return (
        <article className="prose dark:prose-invert max-w-none">
            <h2>Getting Started & Basic Interactions</h2>

            <h3>Getting Started</h3>
            <ol>
                <li><strong>Connect your account</strong>: Use the connect button to authenticate. You can link your wallet, email or Google Account.</li>
                <li><strong>Explore the feed</strong>: Browse existing points and negations in your chosen space.</li>
                <li><strong>Make a point</strong>: Create your first statement to start participating.</li>
            </ol>

            <h3>Basic Interactions</h3>
            <ul>
                <li><strong>Endorse a point</strong>: When you see a point you agree with, you can endorse it with cred.</li>
                <li><strong>Negate a point</strong>: Create a counterargument to challenge an existing point.</li>
                <li><strong>Create a rationale</strong>: Organize multiple points and negations into a structured argument (see "What are Rationales?").</li>
            </ul>

            <h3>Complex Interactions</h3>
            <ul>
                <li><strong>Restake on a point</strong>: Show your conviction by committing to change your mind if a negation proves true.</li>
                <li><strong>Slash your restake</strong>: Acknowledge when a negation has changed your mind.</li>
                <li><strong>Doubt a restake</strong>: Challenge someone's commitment to intellectual honesty.</li>
                <li>(See "The Commitment Mechanism" for more details on Restakes, Slashes, and Doubts).</li>
            </ul>
        </article>
    );
}; 