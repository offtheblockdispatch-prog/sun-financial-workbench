#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'dist');

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, 'workbench-build.txt'), 'SUN Financial Workbench scaffold built successfully.\n');
console.log('Workbench build scaffold created.');
