import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { createMcpServer } from './app.js';

export async function createHttpServer(html?: string) {
  const ui = html ?? await readFile(resolve('dist/ui/index.html'), 'utf8');
  // Optional exact browser origins. MCP server-to-server requests have no Origin.
  const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS ?? '').split(',').map(v => v.trim()).filter(Boolean));
  return createServer(async (req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (pathname === '/mcp') {
      if (req.headers.origin && !allowedOrigins.has(req.headers.origin)) {
        res.writeHead(403).end('Origin not allowed'); return;
      }
      if (req.headers.origin) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, MCP-Protocol-Version, Mcp-Session-Id');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
      }
      if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
      // Stateless transport: no shared sessions, storage, or long-lived SSE required.
      const mcp = createMcpServer(ui);
      const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      res.on('close', () => { void mcp.close(); });
      try {
        await mcp.connect(transport);
        await transport.handleRequest(req, res);
      } catch (error) {
        console.error('MCP request failed', error);
        if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
        if (!res.writableEnded) res.end(JSON.stringify({ error: 'MCP request failed' }));
      }
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(req.method === 'HEAD' ? undefined : JSON.stringify({ status: 'ok' }));
    } else if (pathname === '/' || pathname === '/preview') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(req.method === 'HEAD' ? undefined : ui);
    } else res.writeHead(404).end('Not found');
  });
}
// Importable without listening, for integration tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535');
  const server = await createHttpServer();
  server.listen(port, '0.0.0.0', () => console.log(`SmartCompare listening on 0.0.0.0:${port}`));
  for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => server.close(() => process.exit(0)));
}
