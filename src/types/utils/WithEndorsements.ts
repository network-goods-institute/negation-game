import { Pledge } from "../entities/Pledge";

export type WithEndorsements<T> = T & {
  endorsements: Omit<Pledge, "endorsed">[];
};
