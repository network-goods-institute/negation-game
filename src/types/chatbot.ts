export type InitialOptionObject = {
  id: "distill" | "build" | "generate" | "create_rationale";
  title: string;
  prompt: string;
  description: string;
  disabled?: boolean;
  comingSoon?: boolean;
  isEarlyAccess?: boolean;
};
