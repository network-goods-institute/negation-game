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
                <li><strong>Doubting</strong> is betting against another user&apos;s likelihood of fulfilling their restake commitment (slashing).</li>
            </ul>
            <p>
                Explore the specific topics for detailed explanations of each action and its economic implications.
            </p>
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                    In Negation Game, a &apos;commitment mechanism&apos; refers to any action a user
                    takes that binds their future behavior or reputation based on the
                    outcome of a logical argument. These mechanisms incentivize
                    intellectual honesty and discourage users from changing their minds
                    without acknowledging the reasons why. The primary commitment
                    mechanisms are Restaking, Slashing, and Doubting. They create a system
                    where users put their &apos;cred&apos; (reputation points) on the line, making
                    arguments more than just talk – they have real consequences within the
                    game&apos;s economy.
                </p>
            </div>
        </article>
    );
}; 