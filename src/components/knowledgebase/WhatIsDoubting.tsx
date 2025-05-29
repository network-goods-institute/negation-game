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
                <li>Doubting costs Cred to place and stakes your spent Cred on the Restaker's favor bonus.</li>
                <li>The maximum amount you can doubt is limited by the total effective favor bonus available on that Point-Negation pair (excluding fully slashed restakes).</li>
                <li>Your earnings accumulate passively from the favor bonus until the Restaker Slashes, which stops further earnings. Use the "Collect Earnings" button in your profile to redeem any accumulated earnings. Make sure to check in on it regularly to collect your earnings or you may miss out if the Restaker Slashes.</li>
                <li>If the Restaker Slashes, your future earnings stop; the Cred you spent to Doubt is not refunded.</li>
                <li>Doubts reduce the favor bonus granted by the Restake immediately upon placement (using max(slashed, doubted)).</li>
            </ul>
        </article>
    );
}; 