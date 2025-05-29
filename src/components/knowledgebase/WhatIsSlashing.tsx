export const WhatIsSlashing = () => {
    return (
        <article className="prose dark:prose-invert max-w-none">
            <h2>What is Slashing?</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                    &quot;Slashing&quot; is the act of fulfilling a Restake commitment. When a Negation
                    you Restaked against proves compelling enough to change your mind about
                    the parent Point, you Slash your Restake. This action says, &quot;Yes, this
                    Negation was valid, and I am withdrawing my previously committed
                    support for the Point based on it.&quot; Slashing costs no additional Cred
                    but removes the &quot;favor&quot; bonus your Restake provided and proportionally
                    reduces any Doubts placed against that Restake (punishing the Doubters).
                </p>
            </div>
            <ul>
                <li>This fulfills your commitment to change your mind when compelling evidence meets your agreed condition.</li>
                <li>Slashing costs no additional Cred.</li>
                <li>It removes the favor bonus previously granted by your Restake from the parent Point, cutting off future earnings for Doubters.</li>
            </ul>
        </article>
    );
}; 