export const WhatIsRestaking = () => {
    return (
        <article className="prose dark:prose-invert max-w-none">
            <h2>What is Restaking?</h2>
            <p>
                When you endorse a point and believe in it strongly, you can "restake" on it. This is a commitment to change your mind about that point's endorsement IF a specific negation proves true.
            </p>
            <p>
                Think of it as raising the stakes on your belief. You are stating the specific condition (the negation being true) under which you would change your mind about the parent point.
            </p>
            <ul>
                <li>Restaking costs cred immediately upon placement.</li>
                <li>It grants a favor bonus to the parent point, signaling your strong conviction under specific conditions.</li>
                <li>The amount you can restake is limited by the amount you have endorsed the parent point.</li>
            </ul>
        </article>
    );
}; 