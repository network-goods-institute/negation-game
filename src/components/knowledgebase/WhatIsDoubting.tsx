export const WhatIsDoubting = () => {
    return (
        <article className="prose dark:prose-invert max-w-none">
            <h2>What is Doubting?</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                    &quot;Doubting&quot; is betting against a Restaker&apos;s commitment. When someone
                    Restakes on a Point-Negation pair, they commit to changing their mind (Slashing)
                    if the Negation proves true. If you Doubt their Restake, you&apos;re
                    essentially saying, &quot;I bet you won&apos;t actually Slash even if you should.&quot;
                    If the Restaker *does* Slash, you lose your Doubted amount proportionally.
                    If they *don&apos;t* Slash when the community agrees they should have (a feature
                    still under development), you win. Doubting incentivizes Restakers to
                    follow through on their commitments.
                </p>
                <p>
                    Doubting reduces the &apos;favor&apos; bonus a Restake provides to its parent
                    Point immediately, even before a Slash occurs. It signals a lack of
                    confidence in the Restaker&apos;s conviction.
                </p>
                <p>
                    Doubts are immutable; once placed, they cannot be withdrawn or
                    increased. Their value only decreases if the corresponding Restake is
                    Slashed. This makes Doubting a significant commitment based on your
                    assessment of another user&apos;s intellectual integrity.
                </p>
            </div>
            <ul>
                <li>Doubting costs cred to place.</li>
                <li>The maximum amount you can doubt is limited by the total effective amount restaked on that point-negation pair (excluding fully slashed restakes).</li>
                <li>If the restaker never slashes (or doesn&apos;t slash sufficiently), you win your doubt and earn cred.</li>
                <li>If the restaker does slash, you lose your doubt proportionally to the amount slashed, and the slashed cred goes to the slasher.</li>
                <li>Doubts also reduce the favor bonus granted by the restake immediately upon being placed (using max(slashed, doubted)).</li>
            </ul>
        </article>
    );
}; 