import React from 'react';

export interface GraphSizingContextValue {
    minCred: number;
    maxCred: number;
}

export const GraphSizingContext = React.createContext<GraphSizingContextValue>({
    minCred: 0,
    maxCred: 0,
});

export function useGraphSizing() {
    return React.useContext(GraphSizingContext);
} 