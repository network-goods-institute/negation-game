import { getOffscreenSide } from '@/utils/experiment/multiplayer/viewport';

describe('getOffscreenSide', () => {
  const vw = 800;
  const vh = 600;
  it('returns null when fully visible', () => {
    expect(getOffscreenSide({ left: 100, top: 100, right: 200, bottom: 200 }, vw, vh)).toBe(null);
  });
  it('detects left', () => {
    expect(getOffscreenSide({ left: -120, top: 100, right: -20, bottom: 200 }, vw, vh)).toBe('left');
  });
  it('detects right', () => {
    expect(getOffscreenSide({ left: 820, top: 100, right: 920, bottom: 200 }, vw, vh)).toBe('right');
  });
  it('detects top', () => {
    expect(getOffscreenSide({ left: 100, top: -50, right: 200, bottom: -10 }, vw, vh)).toBe('top');
  });
  it('detects bottom', () => {
    expect(getOffscreenSide({ left: 100, top: 610, right: 200, bottom: 640 }, vw, vh)).toBe('bottom');
  });
  it('picks largest overflow direction', () => {
    expect(getOffscreenSide({ left: -5, top: -200, right: 50, bottom: -100 }, vw, vh)).toBe('top');
  });
});

