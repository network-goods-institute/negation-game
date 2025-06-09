export const WhatIsDoubting = () => {
    return (
        <article className="prose dark:prose-invert max-w-none">
            <h2>What is Doubting?</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                    &apos;Doubting&apos; is betting against a Restaker&apos;s commitment. When someone
                    Restakes on a Point-Negation pair, they&apos;re committing to change
                    their mind if the Negation is valid. Negations can be
                    counterarguments (arguing the point is incorrect) or objections
                    (arguing the point is irrelevant). If you Doubt, you&apos;re betting
                    they won&apos;t follow through. For example, doubt a restake on a
                    counterargument disproving a fact or an objection claiming it&apos;s
                    off-topic.
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
                <li>
                    Doubting costs Cred to place and stakes your spent Cred on the
                    Restaker&apos;s favor bonus. This applies to restakes on any negation type.
                </li>
                <li>
                    The maximum amount you can doubt is limited by the total effective
                    favor bonus available on that Point-Negation pair (excluding fully
                    slashed restakes).
                </li>
                <li>
                    Your earnings accumulate passively from the favor bonus until the
                    Restaker Slashes, which stops further earnings. Use the &quot;Collect
                    Earnings&quot; button in your profile to redeem any accumulated earnings.
                    Make sure to check in on it regularly to collect your earnings or you
                    may miss out if the Restaker Slashes.
                </li>
                <li>
                    If the Restaker Slashes, your future earnings stop; the Cred you spent
                    to Doubt is not refunded.
                </li>
                <li>
                    Doubts reduce the favor bonus granted by the Restake immediately upon
                    placement (using max(slashed, doubted)).
                </li>
            </ul>
        </article>
    );
}; 