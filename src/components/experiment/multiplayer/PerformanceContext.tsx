import React, { createContext, useContext } from 'react';

type PerfContextValue = {
  perfMode: boolean;
  setPerfMode?: (value: boolean) => void;
};

const PerfContext = createContext<PerfContextValue>({ perfMode: false });

export const PerfProvider = PerfContext.Provider;

export const usePerformanceMode = () => useContext(PerfContext);
