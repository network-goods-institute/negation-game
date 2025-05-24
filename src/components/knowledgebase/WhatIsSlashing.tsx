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
                <li>This fulfills your commitment to change your mind when presented with compelling evidence you previously agreed would change your mind.</li>
                <li>Slashing costs no additional cred.</li>
                <li>It removes the favor bonus previously granted by the restake from the parent point.</li>
                <li>If others doubted your restake, slashing penalizes those doubters proportionally.</li>
            </ul>
        </article>
    );
}; 