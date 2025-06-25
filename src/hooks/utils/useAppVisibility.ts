import React from "react";

export const useAppVisibility = () => {
  const [isVisible, setIsVisible] = React.useState(
    typeof document === "undefined"
      ? true
      : document.visibilityState === "visible"
  );

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return isVisible;
};
