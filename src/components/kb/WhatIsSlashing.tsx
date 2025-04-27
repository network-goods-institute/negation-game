export const WhatIsSlashing = () => {
    return (
        <article className="prose dark:prose-invert max-w-none">
            <h2>What is Slashing?</h2>
            <p>
                If you later acknowledge that a negation you restaked against has merit and it changes your mind about the parent point you endorsed, you "slash" your restake.
            </p>
            <p>
                Slashing is the act of fulfilling the commitment you made when you restaked. It demonstrates intellectual honesty.
            </p>
            <ul>
                <li>This fulfills your commitment to change your mind when presented with compelling evidence you previously agreed would change your mind.</li>
                <li>Slashing costs no additional cred.</li>
                <li>It removes the favor bonus previously granted by the restake from the parent point.</li>
                <li>If others doubted your restake, slashing penalizes those doubters proportionally.</li>
            </ul>
        </article>
    );
}; 