#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');

function run(command, args) {
	const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
	if (result.status !== 0) {
		process.exit(result.status || 1);
	}
}

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.SUBMODULE_TOKEN || '';

if (token) {
	const urlKey = `url.https://x-access-token:${token}@github.com/.insteadOf`;
	run('git', ['config', '--global', urlKey, 'https://github.com/']);
}

run('git', ['submodule', 'sync', '--recursive']);
run('git', ['submodule', 'update', '--init', '--recursive', '--depth', '1']);


