export const WhatIsDoubting = () => {
    return (
        <article className="prose dark:prose-invert max-w-none">
            <h2>What is Doubting?</h2>
            <p>
                If you believe someone won't follow through on their restake commitment (i.e., they won't slash even if the negation seems valid and should change their mind based on their stated commitment), you can "doubt" their restake.
            </p>
            <p>
                Doubting is essentially a bet against another user's intellectual honesty or consistency.
            </p>
            <ul>
                <li>Doubting costs cred to place.</li>
                <li>The maximum amount you can doubt is limited by the total effective amount restaked on that point-negation pair (excluding fully slashed restakes).</li>
                <li>If the restaker never slashes (or doesn't slash sufficiently), you win your doubt and earn cred.</li>
                <li>If the restaker does slash, you lose your doubt proportionally to the amount slashed, and the slashed cred goes to the slasher.</li>
                <li>Doubts also reduce the favor bonus granted by the restake immediately upon being placed (using max(slashed, doubted)).</li>
            </ul>
        </article>
    );
}; 