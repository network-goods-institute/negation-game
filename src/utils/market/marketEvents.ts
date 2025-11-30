const MARKET_PANEL_CLOSE_EVENT = 'market:panelClose' as const;

export const dispatchMarketPanelClose = (): void => {
  try {
    marketEventTarget.dispatchEvent(new Event(MARKET_PANEL_CLOSE_EVENT));
  } catch { }
};

export const addMarketPanelCloseListener = (handler: () => void): (() => void) => {
  const listener = () => handler();
  marketEventTarget.addEventListener(MARKET_PANEL_CLOSE_EVENT, listener);
  return () => marketEventTarget.removeEventListener(MARKET_PANEL_CLOSE_EVENT, listener);
};

const marketEventTarget = new EventTarget();

export const marketEvents = {
  target: marketEventTarget,
  events: {
    panelClose: MARKET_PANEL_CLOSE_EVENT,
  },
};
