export const CommitmentMechanism = () => {
    return (
        <article className="prose dark:prose-invert max-w-none">
            <h2>Commitment Mechanism Overview</h2>
            <p>
                The Negation Game features an advanced interaction loop designed to incentivize intellectual honesty and reasoned belief change. This revolves around three key actions: Restaking, Slashing, and Doubting.
            </p>
            <p>
                These actions create an economic layer on top of arguments, where users commit cred based on their willingness to change their minds under specific conditions.
            </p>
            <ul>
                <li><strong>Restaking</strong> is the act of committing to reconsider your endorsement of a point if a specific negation proves true.</li>
                <li><strong>Slashing</strong> is fulfilling that commitment by acknowledging the negation changed your mind about the point.</li>
                <li><strong>Doubting</strong> is betting against another user's likelihood of fulfilling their restake commitment (slashing).</li>
            </ul>
            <p>
                Explore the specific topics for detailed explanations of each action and its economic implications.
            </p>
        </article>
    );
}; 