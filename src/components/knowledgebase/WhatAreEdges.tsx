export const WhatAreEdges = () => {
    return (
        <article className="prose dark:prose-invert max-w-none">
            <h2>Understanding Edges in the Negation Game</h2>
            <p>
                In the Negation Game, every edge is a <strong>negation</strong>—an argument against the parent node.
            </p>
            <p>
                An important exception exists: edges directly connected to the main statement node (the root of the graph) are not negations. These are called <strong>options</strong>. Options represent different choices, perspectives, or initial positions one could take regarding the statement.
            </p>
            <p>
                All other edges, including those originating from options or other negations, function as negations. This structure allows for building complex chains of arguments and counterarguments, fostering deep critical thinking.
            </p>
        </article>
    );
};