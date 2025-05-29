export const WhatIsRestaking = () => {
    return (
        <article className="prose dark:prose-invert max-w-none">
            <h2>What is Restaking?</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                    &quot;Restaking&quot; is a core commitment mechanism. When you Restake on a
                    Point-Negation pair, you&apos;re saying: &quot;I currently endorse the Point, BUT
                    if this specific Negation turns out to be true/valid, I commit to
                    changing my mind about the Point.&quot; Restaking does not cost additional Cred;
                    instead, it grants a favor bonus to the parent Point, risking your endorsement on that Point to be claimed by Doubters until you Slash.
                </p>
            </div>
            <p>
                Think of it as raising the stakes on your belief. You are stating the specific condition (the negation being true) under which you would change your mind about the parent point.
            </p>
            <ul>
                <li>Restaking does not cost additional Cred; it grants a favor bonus to the parent Point, which Doubters can claim until you Slash.</li>
                <li>It grants a favor bonus to the parent Point, reflecting your conviction and serving as the basis for Doubters&apos; earnings.</li>
                <li>The amount you can restake is limited by the amount you have endorsed the parent point.</li>
            </ul>
        </article>
    );
}; 