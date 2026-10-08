// Make the MCP resource self-contained; sandbox hosts cannot fetch local assets.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const dir = resolve('dist/ui');
let html = await readFile(resolve(dir, 'index.html'), 'utf8');
for (const match of [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)]) {
  const js = await readFile(resolve(dir, match[1]), 'utf8');
  html = html.replace(match[0], () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
}
for (const match of [...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)]) {
  const css = await readFile(resolve(dir, match[1]), 'utf8');
  html = html.replace(match[0], () => `<style>${css}</style>`);
}
await writeFile(resolve(dir, 'index.html'), html);
