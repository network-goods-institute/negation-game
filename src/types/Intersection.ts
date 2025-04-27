export type Intersection<T, U> = {
  [K in keyof T & keyof U]: (K extends keyof T ? T[K] : never) &
    (K extends keyof U ? U[K] : never);
};
