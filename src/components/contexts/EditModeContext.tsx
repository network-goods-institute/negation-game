// can probably be refactored out completely eventually, but due to deadline this is how it'll be for now

import { ReactNode, createContext, useContext } from "react";

type EditModeContextType = boolean;

// Always provide true as the context default value
const EditModeContext = createContext<EditModeContextType>(true);

interface EditModeProviderProps {
  children: ReactNode;
}

export function EditModeProvider({
  children,
}: EditModeProviderProps) {
  return (
    <EditModeContext.Provider value={true}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);

  if (context === undefined) {
    return true; // Return true as the fallback value
  }

  return context;
}
