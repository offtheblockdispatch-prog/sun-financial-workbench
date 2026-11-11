#!/usr/bin/env node
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await writeFile('dist/BUILD_INFO.txt',`SUN Workbench standalone slice build\nBuilt: ${new Date().toISOString()}\nNode: ${process.version}\n`);
console.log('Build artifact written to dist/BUILD_INFO.txt');
