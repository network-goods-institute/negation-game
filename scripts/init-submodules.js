#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const carrollPath = path.join(repoRoot, 'src', 'lib', 'carroll');
const criticalSubmodules = ['discourse', 'yjs-ws'];

const carrollStubs = {
  'index.ts': `// Auto-generated stub - carroll submodule not initialized
export * from './market';
export * from './fixed';
export * from './structure';
export * from './marketActors';
`,
  'market.ts': `// Auto-generated stub - market features disabled
export const createMarketMaker = (..._args: any[]): any => {
	throw new Error('Market features disabled - NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED not set');
};
export const defaultB = 0n;
`,
  'fixed.ts': `// Auto-generated stub - market features disabled
export const fromFixed = (_value: any): any => {
	throw new Error('Market features disabled - NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED not set');
};
export const toFixed = (_value: any): any => {
	throw new Error('Market features disabled - NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED not set');
};
export const exp = (_value: any): any => {
	throw new Error('Market features disabled - NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED not set');
};
export const mul = (_a: any, _b: any): any => {
	throw new Error('Market features disabled - NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED not set');
};
export const div = (_a: any, _b: any): any => {
	throw new Error('Market features disabled - NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED not set');
};
export const add = (_a: any, _b: any): any => {
	throw new Error('Market features disabled - NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED not set');
};
export const sub = (_a: any, _b: any): any => {
	throw new Error('Market features disabled - NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED not set');
};
export const SCALE = 0n;
`,
  'structure.ts': `// Auto-generated stub - market features disabled
export interface CarrollStructure {
	nodes: string[];
	edges: any[];
}
export interface CarrollEdge {
	name: string;
	from: string;
	to: string;
}
export const createStructure = (..._args: any[]): any => {
	throw new Error('Market features disabled - NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED not set');
};
export const buildSecurities = (..._args: any[]): any => {
	throw new Error('Market features disabled - NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED not set');
};
export const enumerateValidOutcomes = (..._args: any[]): any => {
	throw new Error('Market features disabled - NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED not set');
};
export const evalSecurity = (..._args: any[]): any => {
	throw new Error('Market features disabled - NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED not set');
};
export const parseSecurity = (..._args: any[]): any => {
	throw new Error('Market features disabled - NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED not set');
};
`,
  'marketActors.ts': `// Auto-generated stub - market features disabled
export const createMarket = (..._args: any[]): any => {
	throw new Error('Market features disabled - NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED not set');
};
`,
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, ...options });
  if (result.status !== 0 && !options.allowFailure) {
    process.exit(result.status || 1);
  }
  return result.status === 0;
}

function writeCarrollStubs(targetPath = carrollPath, fsModule = fs) {
  if (!fsModule.existsSync(targetPath)) {
    fsModule.mkdirSync(targetPath, { recursive: true });
  }

  for (const [filename, content] of Object.entries(carrollStubs)) {
    fsModule.writeFileSync(path.join(targetPath, filename), content);
  }
}

function removeCarrollStubsIfPresent(targetPath = carrollPath, fsModule = fs) {
  if (!fsModule.existsSync(targetPath)) {
    return false;
  }

  if (fsModule.existsSync(path.join(targetPath, '.git'))) {
    return false;
  }

  const stubNames = Object.keys(carrollStubs);
  const entries = fsModule.readdirSync(targetPath);

  if (entries.length !== stubNames.length || !entries.every((entry) => stubNames.includes(entry))) {
    return false;
  }

  for (const name of stubNames) {
    const filePath = path.join(targetPath, name);
    const stats = fsModule.statSync(filePath);
    if (!stats.isFile()) {
      return false;
    }

    const content = fsModule.readFileSync(filePath, 'utf8');
    if (content !== carrollStubs[name]) {
      return false;
    }
  }

  fsModule.rmSync(targetPath, { recursive: true, force: true });
  return true;
}

function assertSubmoduleInitialized(dirPath, name, fsModule = fs) {
  const exists = fsModule.existsSync(path.join(dirPath, '.git'));

  if (!exists) {
    console.error(`❌ Critical submodule '${name}' failed to initialize`);
    process.exit(1);
  }
}

function validateRequiredSubmodules({
  repoRootPath = repoRoot,
  fsModule = fs,
  requireCarroll = false,
  carrollRoot = carrollPath,
} = {}) {
  for (const submodule of criticalSubmodules) {
    const submodulePath = path.join(repoRootPath, submodule);
    assertSubmoduleInitialized(submodulePath, submodule, fsModule);
  }

  if (requireCarroll) {
    assertSubmoduleInitialized(carrollRoot, 'carroll', fsModule);
  }
}

function initSubmodules({
  env = process.env,
  runCommand = run,
  repoRootPath = repoRoot,
  fsModule = fs,
} = {}) {
  const token = env.GITHUB_TOKEN || env.GH_TOKEN || env.SUBMODULE_TOKEN || '';

  if (token) {
    const urlKey = `url.https://x-access-token:${token}@github.com/.insteadOf`;
    runCommand('git', ['config', '--local', urlKey, 'https://github.com/']);
  }

  runCommand('git', ['submodule', 'sync', '--recursive']);

  const carrollRoot = path.join(repoRootPath, 'src', 'lib', 'carroll');
  removeCarrollStubsIfPresent(carrollRoot, fsModule);

  const success = runCommand('git', ['submodule', 'update', '--init', '--recursive', '--depth', '1'], {
    allowFailure: true,
  });

  const carrollExists =
    fsModule.existsSync(path.join(carrollRoot, '.git')) ||
    fsModule.existsSync(path.join(carrollRoot, 'package.json'));
  const marketEnabled = env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED === 'true';

  if (success) {
    validateRequiredSubmodules({
      repoRootPath,
      fsModule,
      requireCarroll: marketEnabled,
      carrollRoot,
    });
    return;
  }

  console.warn('⚠️  Some submodules failed to initialize. Checking if carroll can be skipped...');

  const canUseStubs = !carrollExists && !marketEnabled;

  if (canUseStubs) {
    console.warn('ℹ️  carroll submodule not initialized, but market features are disabled. Creating stubs...');

    writeCarrollStubs(carrollRoot, fsModule);

    console.log('✓ Created carroll stubs in src/lib/carroll/');
    console.log('  (market.ts, fixed.ts, structure.ts, marketActors.ts, index.ts)');

    validateRequiredSubmodules({
      repoRootPath,
      fsModule,
      requireCarroll: false,
      carrollRoot,
    });
  } else {
    console.error('❌ git submodule update failed for required submodules');
    process.exit(1);
  }
}

if (require.main === module) {
  initSubmodules();
}

module.exports = {
  carrollStubs,
  initSubmodules,
  removeCarrollStubsIfPresent,
  run,
  validateRequiredSubmodules,
  writeCarrollStubs,
};
