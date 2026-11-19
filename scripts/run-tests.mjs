// Runs the Node test suite. The MCM reference fixtures (tests/fixtures/mcm) are
// kept out of git because of their size; when they are absent, test files that
// read them are skipped instead of failing. Pass extra node --test flags through.
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';

const dir='tests',fixtures=join(dir,'fixtures','mcm');
const files=readdirSync(dir).filter(f=>f.endsWith('.test.js')).sort().map(f=>join(dir,f));
const haveFixtures=existsSync(fixtures)&&readdirSync(fixtures).length>0;
const run=haveFixtures?files:files.filter(f=>!readFileSync(f,'utf8').includes('fixtures/mcm'));
if(!haveFixtures)console.log(`# ${fixtures} not found: skipping ${files.length-run.length} fixture-dependent test files (running ${run.length}).`);
const result=spawnSync(process.execPath,['--test',...process.argv.slice(2),...run],{stdio:'inherit'});
process.exit(result.status??1);
