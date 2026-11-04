import {execFileSync} from 'node:child_process';
import {build} from 'vite';
import {build as bundle} from 'esbuild';
import fs from 'node:fs';
// Separate output: never put the server artifact or private entry in Pages' public dist.
process.env.VITE_PRIVATE_ACCESS='true';
delete process.env.VITE_SUPABASE_URL;
delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
execFileSync(process.execPath,['node_modules/typescript/bin/tsc','-b'],{stdio:'inherit'});
await build({build:{outDir:'dist-private'},define:{'import.meta.env.VITE_PRIVATE_ACCESS':JSON.stringify('true')}});
await bundle({entryPoints:['server/worker.mjs'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist-private/_worker.js'});
fs.writeFileSync('dist-private/_routes.json',JSON.stringify({version:1,include:['/*'],exclude:[]}));
fs.writeFileSync('dist-private/_headers','/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n');
await import('./check-private-build.mjs');
console.log('Private Pages artifact built. All paths go through authorization; absent settings deny access.');
