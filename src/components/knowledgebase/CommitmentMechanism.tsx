export const CommitmentMechanism = () => {
    return (
        <article className="prose dark:prose-invert max-w-none">
            <h2>Commitment Mechanism Overview</h2>
            <p>
                The Negation Game features an advanced interaction loop designed to
                incentivize intellectual honesty and reasoned belief change. This
                revolves around three key actions: Restaking, Slashing, and Doubting.
            </p>
            <p>
                These actions create an economic layer on top of arguments, where users
                commit cred based on their willingness to change their minds under
                specific conditions.
            </p>
            <ul>
                <li>
                    <strong>Restaking</strong>: Commit to reconsider your endorsement if a
                    specific negation proves true. Negations can be counterarguments
                    (arguing the point is incorrect) or objections (arguing the point is
                    irrelevant). Restaking does not cost additional Cred; it allocates a
                    portion of your existing Cred endorsed to the parent Point and grants
                    a favor bonus to the parent Point. This bonus is at risk and can be
                    claimed by Doubters until you Slash.
                </li>
                <li>
                    <strong>Slashing</strong>: Fulfill your Restake commitment by
                    acknowledging the negation changed your mind. Slashing costs no
                    additional Cred, removes the favor bonus, and you earn Cred based on
                    the conditions you committed to.
                </li>
                <li>
                    <strong>Doubting</strong>: Bet against a Restaker&apos;s likelihood of
                    Slashing. Doubting costs Cred to place; if the Restaker does not Slash
                    when expected, you win your Doubt and earn Cred, redeemable via the
                    &quot;Collect Earnings&quot; button. If they Slash, you lose your Doubted Cred.
                </li>
            </ul>
            <p>
                Explore the specific topics for detailed explanations of each action and
                its economic implications. Cred is spent on Endorsements and Doubts;
                Restakes grant favor bonuses at risk, and Slashes remove those bonuses,
                stopping Doubter earnings.
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