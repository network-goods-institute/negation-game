export const WhatIsCred = () => {
    return (
        <article className="prose dark:prose-invert max-w-none">
            <h2>What are Cred and Favor?</h2>
            <h3>Cred</h3>
            <p>
                &quot;Cred&quot; (Credibility) is the primary currency in Negation Game. You earn
                it by contributing constructively and lose it through actions that harm
                the system&apos;s integrity (like making bad-faith arguments or failing to
                uphold commitments). Cred is used to endorse Points, place Restakes,
                and make Doubts. Think of it as your reputation score and your primary
                resource for participating in the game&apos;s economy.
            </p>
            <h3>Favor</h3>
            <p>
                Favor is a measure of how much the community believes in a point. It&apos;s calculated based on the point/negation cred ratio and is boosted by restakes, but reduced by slashes and doubts.
            </p>
            <p>
                High favor indicates strong community agreement or well-supported arguments, considering the economic commitments made.
            </p>
        </article>
    );
}; 