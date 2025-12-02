#!/usr/bin/env node
'use strict';

// Load .env files if present
try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
} catch (e) {
  // dotenv not available or .env doesn't exist - continue without it
}

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
export type Name = string;

export type CarrollEdge = {
	name: Name;
	from: Name;
	to: Name;
};

export type CarrollStructure = {
	nodes: Name[];
	edges: CarrollEdge[];
	supportEdges: CarrollEdge[];
	names: Name[];
	indexOf: (name: Name) => number;
};

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

  console.log('🔍 Token check:', {
    hasGITHUB_TOKEN: !!env.GITHUB_TOKEN,
    hasGH_TOKEN: !!env.GH_TOKEN,
    hasSUBMODULE_TOKEN: !!env.SUBMODULE_TOKEN,
    tokenPresent: !!token,
    tokenLength: token.length,
  });

  let configuredToken = false;
  if (token) {
    console.log('✓ Token found, validating access to carroll repository...');

    const testResult = spawnSync('git', [
      'ls-remote',
      '--exit-code',
      `https://x-access-token:${token}@github.com/network-goods-institute/carroll-lmsr-ts.git`,
      'HEAD'
    ], { stdio: 'pipe', shell: false });

    if (testResult.status !== 0) {
      console.error('❌ Token validation failed - cannot access carroll repository');
      console.error('   Make sure your token has access to network-goods-institute/carroll-lmsr-ts');
      const stderr = testResult.stderr?.toString() || '';
      if (stderr.includes('Invalid username or token')) {
        console.error('   Error: Invalid or expired token');
      } else if (stderr.includes('403')) {
        console.error('   Error: Token lacks required permissions or org policy restriction');
      }
      console.warn('⚠️  Proceeding anyway - may fall back to stubs if market is disabled');
    } else {
      console.log('✓ Token validated successfully');
    }

    console.log('✓ Configuring git with token...');
    const urlKey = `url.https://x-access-token:${token}@github.com/.insteadOf`;
    runCommand('git', ['config', '--local', urlKey, 'https://github.com/']);
    configuredToken = true;
  } else {
    console.warn('⚠️  No GitHub token found in environment');
  }

  runCommand('git', ['submodule', 'sync', '--recursive']);

  const carrollRoot = path.join(repoRootPath, 'src', 'lib', 'carroll');
  removeCarrollStubsIfPresent(carrollRoot, fsModule);

  const success = runCommand('git', ['submodule', 'update', '--init', '--recursive', '--depth', '1'], {
    allowFailure: true,
  });

  if (configuredToken) {
    const urlKey = `url.https://x-access-token:${token}@github.com/.insteadOf`;
    runCommand('git', ['config', '--local', '--unset-all', urlKey], { allowFailure: true });
  }

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
