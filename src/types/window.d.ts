declare global {
  interface Window {
    _saveExistingRationale?: () => Promise<boolean | void>;
    _saveAsNewRationale?: () => Promise<boolean | void>;
  }
}

export {};
