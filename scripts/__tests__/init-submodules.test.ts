import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  carrollStubs,
  initSubmodules,
  removeCarrollStubsIfPresent,
  writeCarrollStubs,
} from '../init-submodules.js';

const criticalSubmodules = ['discourse', 'yjs-ws'];

const createTempRepo = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'init-submodules-'));
  return { root, carrollDir: path.join(root, 'src', 'lib', 'carroll') };
};

const stubCriticalSubmodules = (root: string) => {
  for (const name of criticalSubmodules) {
    const dir = path.join(root, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.git'), 'stub');
  }
};

describe('init-submodules', () => {
  let tempRoot: string;
  let carrollDir: string;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    ({ root: tempRoot, carrollDir } = createTempRepo());
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`process.exit: ${code ?? ''}`);
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('removes generated carroll stubs before attempting to init submodule', () => {
    writeCarrollStubs(carrollDir);
    const runCommand = jest.fn((cmd, args) => {
      if (cmd === 'git' && args[1] === 'update') {
        if (fs.existsSync(carrollDir)) {
          throw new Error('stubs still present');
        }
      }
      return true;
    });

    initSubmodules({ runCommand, repoRootPath: tempRoot, env: { ...process.env } });

    expect(runCommand).toHaveBeenCalledWith(
      'git',
      ['submodule', 'update', '--init', '--recursive', '--depth', '1'],
      { allowFailure: true },
    );
    expect(fs.existsSync(carrollDir)).toBe(false);
  });

  it('does not remove non-stub carroll contents', () => {
    writeCarrollStubs(carrollDir);
    const alteredPath = path.join(carrollDir, 'market.ts');
    fs.writeFileSync(alteredPath, 'not a stub');

    const removed = removeCarrollStubsIfPresent(carrollDir);

    expect(removed).toBe(false);
    expect(fs.existsSync(carrollDir)).toBe(true);
    expect(fs.readFileSync(alteredPath, 'utf8')).toBe('not a stub');
  });

  it('removes stub files when present', () => {
    writeCarrollStubs(carrollDir);

    const removed = removeCarrollStubsIfPresent(carrollDir);

    expect(removed).toBe(true);
    expect(fs.existsSync(carrollDir)).toBe(false);
  });

  it('recreates stubs when market features are disabled and update fails', () => {
    stubCriticalSubmodules(tempRoot);
    const runCommand = jest.fn((cmd, args) => {
      if (cmd === 'git' && args[1] === 'update') {
        return false;
      }
      return true;
    });

    initSubmodules({
      runCommand,
      repoRootPath: tempRoot,
      env: { ...process.env, NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED: 'false' },
    });

    for (const [fileName, content] of Object.entries(carrollStubs)) {
      const filePath = path.join(carrollDir, fileName);
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf8')).toBe(content);
    }
  });
});
