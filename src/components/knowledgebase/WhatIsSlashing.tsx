export const WhatIsSlashing = () => {
    return (
        <article className="prose dark:prose-invert max-w-none">
            <h2>What is Slashing?</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                    &apos;Slashing&apos; is the act of fulfilling a Restake commitment. When a
                    Negation you Restaked against proves compelling enough to change
                    your mind, you Slash your Restake. Negations can be
                    counterarguments (arguing the point is incorrect) or objections
                    (arguing the point is irrelevant). This action says,
                    &apos;Yes, this Negation was valid, and I am withdrawing my support.&apos; For
                    example, slash if a counterargument disproves a fact or an objection
                    shows it&apos;s off-topic.
                </p>
            </div>
            <ul>
                <li>
                    This fulfills your commitment to change your mind when compelling
                    evidence meets your agreed condition, whether it&apos;s a counterargument
                    or objection.
                </li>
                <li>Slashing costs no additional Cred.</li>
                <li>
                    It removes the favor bonus previously granted by your Restake from the
                    parent Point, cutting off future earnings for Doubters.
                </li>
            </ul>
        </article>
    );
}; 