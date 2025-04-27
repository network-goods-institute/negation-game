export const WhatIsCred = () => {
    return (
        <article className="prose dark:prose-invert max-w-none">
            <h2>What are Cred and Favor?</h2>
            <h3>Cred</h3>
            <p>
                Cred is the primary currency in the system. You spend cred to endorse points, make restakes, and place doubts.
            </p>
            <p>
                Think of it like your intellectual capital or reputation score within the game.
            </p>
            <h3>Favor</h3>
            <p>
                Favor is a measure of how much the community believes in a point. It's calculated based on the point/negation cred ratio and is boosted by restakes, but reduced by slashes and doubts.
            </p>
            <p>
                High favor indicates strong community agreement or well-supported arguments, considering the economic commitments made.
            </p>
        </article>
    );
}; 