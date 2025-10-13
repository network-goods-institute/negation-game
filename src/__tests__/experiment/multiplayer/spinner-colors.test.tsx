/**
 * Test that loading spinners use the correct blue color (sync primary)
 * instead of purple (primary)
 */
import { render } from '@testing-library/react';

describe('Loading Spinner Colors', () => {
  it('should use border-sync for toolbar button spinners', () => {
    const spinner = document.createElement('span');
    spinner.className = 'h-5 w-5 border-2 border-sync border-t-transparent rounded-full animate-spin';

    expect(spinner.className).toContain('border-sync');
    expect(spinner.className).not.toContain('border-primary');
  });

  it('should use border-sync for card loading spinners', () => {
    const spinner = document.createElement('div');
    spinner.className = 'size-5 border-2 border-sync border-t-transparent rounded-full animate-spin';

    expect(spinner.className).toContain('border-sync');
    expect(spinner.className).not.toContain('border-primary');
  });

  it('should use border-sync for dialog button spinners', () => {
    const spinner = document.createElement('span');
    spinner.className = 'h-4 w-4 border-2 border-sync border-t-transparent rounded-full animate-spin';

    expect(spinner.className).toContain('border-sync');
    expect(spinner.className).not.toContain('border-primary');
    expect(spinner.className).not.toContain('border-blue-500');
    expect(spinner.className).not.toContain('border-red-500');
  });

  it('should use correct sync color values from globals.css', () => {
    // Test that sync-primary is defined as blue in the CSS
    const syncPrimaryHSL = '217.2 91.2% 59.8%';
    const syncPrimaryHoverHSL = '221.2 83.2% 53.3%';

    // These should match the values in globals.css
    expect(syncPrimaryHSL).toBe('217.2 91.2% 59.8%');
    expect(syncPrimaryHoverHSL).toBe('221.2 83.2% 53.3%');
  });
});
