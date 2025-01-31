import { ReactNode, createContext, useContext } from "react";

interface OriginalPosterContextType {
  originalPosterId: string | undefined;
}

const OriginalPosterContext = createContext<OriginalPosterContextType>({
  originalPosterId: undefined,
});

interface OriginalPosterProviderProps {
  originalPosterId?: string;
  children: ReactNode;
}

export function OriginalPosterProvider({
  originalPosterId,
  children,
}: OriginalPosterProviderProps) {
  return (
    <OriginalPosterContext.Provider value={{ originalPosterId }}>
      {children}
    </OriginalPosterContext.Provider>
  );
}

export function useOriginalPoster() {
  const context = useContext(OriginalPosterContext);

  if (context === undefined) {
    return { originalPosterId: undefined };
  }

  return context;
}
