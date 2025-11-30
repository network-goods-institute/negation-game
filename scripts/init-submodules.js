#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command, args, options = {}) {
	const result = spawnSync(command, args, { stdio: 'inherit', shell: false, ...options });
	if (result.status !== 0 && !options.allowFailure) {
		process.exit(result.status || 1);
	}
	return result.status === 0;
}

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.SUBMODULE_TOKEN || '';

if (token) {
	const urlKey = `url.https://x-access-token:${token}@github.com/.insteadOf`;
	run('git', ['config', '--global', urlKey, 'https://github.com/']);
}

run('git', ['submodule', 'sync', '--recursive']);

const success = run('git', ['submodule', 'update', '--init', '--recursive', '--depth', '1'], { allowFailure: true });

if (!success) {
	console.warn('⚠️  Some submodules failed to initialize. Checking if carroll can be skipped...');

	const carrollPath = path.join(__dirname, '..', 'src', 'lib', 'carroll');
	const carrollExists = fs.existsSync(path.join(carrollPath, '.git')) || fs.existsSync(path.join(carrollPath, 'package.json'));

	if (!carrollExists) {
		const marketEnabled = process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED === 'true';

		if (marketEnabled) {
			console.error('❌ carroll submodule is required when NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED=true');
			process.exit(1);
		} else {
			console.warn('ℹ️  carroll submodule not initialized, but market features are disabled. Creating stubs...');

			if (!fs.existsSync(carrollPath)) {
				fs.mkdirSync(carrollPath, { recursive: true });
			}

			const stubs = {
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

			for (const [filename, content] of Object.entries(stubs)) {
				fs.writeFileSync(path.join(carrollPath, filename), content);
			}

			console.log('✓ Created carroll stubs in src/lib/carroll/');
			console.log('  (market.ts, fixed.ts, structure.ts, marketActors.ts, index.ts)');
		}
	}

	const criticalSubmodules = ['discourse', 'yjs-ws'];
	for (const submodule of criticalSubmodules) {
		const submodulePath = path.join(__dirname, '..', submodule);
		const exists = fs.existsSync(path.join(submodulePath, '.git'));

		if (!exists) {
			console.error(`❌ Critical submodule '${submodule}' failed to initialize`);
			process.exit(1);
		}
	}
}


