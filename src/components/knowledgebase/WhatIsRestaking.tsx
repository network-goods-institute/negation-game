export const WhatIsRestaking = () => {
    return (
        <article className="prose dark:prose-invert max-w-none">
            <h2>What is Restaking?</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                    &quot;Restaking&quot; is a core commitment mechanism. When you Restake on a
                    Point-Negation pair, you&apos;re saying: &quot;I currently endorse the Point, BUT
                    if this specific Negation turns out to be true/valid, I commit to
                    changing my mind about the Point.&quot; It costs Cred immediately but grants
                    a &quot;favor&quot; bonus to the Point, showing extra conviction because you&apos;ve
                    stated the conditions under which you&apos;d reconsider.
                </p>
            </div>
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