import { ReactNode, createContext, useContext } from "react";

type EditModeContextType = boolean;

const EditModeContext = createContext<EditModeContextType>(false);

interface EditModeProviderProps {
  editMode: boolean;
  children: ReactNode;
}

export function EditModeProvider({
  editMode,
  children,
}: EditModeProviderProps) {
  return (
    <EditModeContext.Provider value={editMode}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);

  if (context === undefined) {
    return false;
  }

  return context;
}
