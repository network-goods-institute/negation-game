export interface FavorArgs {
  cred: number;
  negationsCred: number;
}

export const favor = ({ cred, negationsCred }: FavorArgs) =>
  cred > 0 ? Math.floor((100 * cred) / (negationsCred + cred)) : 0;
