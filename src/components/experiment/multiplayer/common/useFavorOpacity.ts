import { useMemo } from 'react';

interface UseFavorOpacityProps {
  favor: number;
  selected: boolean;
  hovered: boolean;
  /** Additional conditions that should show full opacity */
  additionalFullOpacityConditions?: boolean[];
}

export const useFavorOpacity = ({
  favor,
  selected,
  hovered,
  additionalFullOpacityConditions = [],
}: UseFavorOpacityProps) => {
  return useMemo(() => {
    if (selected || hovered || additionalFullOpacityConditions.some(Boolean)) {
      return 1;
    }
    return Math.max(0.3, Math.min(1, favor / 5));
  }, [favor, hovered, selected, additionalFullOpacityConditions]);
};