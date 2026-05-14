import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

await mkdir(distDir, { recursive: true });
await copyFile(path.join(rootDir, 'portfolio.html'), path.join(distDir, 'portfolio.html'));
