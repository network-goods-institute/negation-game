import fs from 'fs';
import path from 'path';

/**
 * Detects if carroll submodule is stubbed (not properly initialized)
 * Used to conditionally skip market tests that require the real carroll implementation
 */
export function isCarrollStubbed(): boolean {
  try {
    const carrollMarketPath = path.join(process.cwd(), 'src/lib/carroll/market.ts');

    if (!fs.existsSync(carrollMarketPath)) {
      return true; // If file doesn't exist, consider it stubbed
    }

    const content = fs.readFileSync(carrollMarketPath, 'utf8');

    // Check if the file contains the stub signature
    return content.includes('Auto-generated stub');
  } catch (error) {
    // If we can't read the file, assume it's stubbed to be safe
    return true;
  }
}

/**
 * Skip condition for Jest tests that require carroll submodule
 * Usage: describe.skipIf(skipIfCarrollStubbed)('market tests', () => { ... })
 */
export const skipIfCarrollStubbed = isCarrollStubbed();
