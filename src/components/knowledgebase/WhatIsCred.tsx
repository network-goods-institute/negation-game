export const WhatIsCred = () => {
    return (
        <article className="prose dark:prose-invert max-w-none">
            <h2>What are Cred and Favor?</h2>
            <h3>Cred</h3>
            <p>
                &quot;Cred&quot; (Credibility) is the primary resource in the Negation Game, allocated to each user at the start. You spend Cred to endorse Points and place Doubts; Restakes and Slashes do not cost additional Cred. When you Doubt, your earnings accumulate passively from the favor bonus until the Restaker Slashes, which cuts off further earnings. Use the &quot;Collect Earnings&quot; button in your profile to redeem any accumulated earnings. You must check in on it regularly to collect your earnings or you may miss out if the Restaker Slashes.
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