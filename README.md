# MCP Components proof of concept

A small AI-native React component library with two MCP Apps components:

- **SmartCompare** exposes `compare_options` for interactive two-option decisions.
- **Plan Comparison** exposes `compare_plans` for three-tier pricing and feature matrices. Its visual implementation is based on the `Plan comparison` frame in the MCP_COMPONENTS Figma file.

Both components support English and Spanish and include text fallbacks for clients that cannot render MCP Apps UI. No database, login, or API key is needed: the assistant provides the data; this server does not call an AI API.

## Local setup

Use Node.js **22.12+** (or newer supported Node).

```sh
npm ci
npm run build
npm start
```

Open <http://localhost:3000/preview> (or `/`) for the Plan Comparison browser preview. Add `?component=smartcompare` to preview SmartCompare. MCP endpoint: <http://localhost:3000/mcp>. Health: <http://localhost:3000/health>.

For UI development, run `npm run dev` and open the Vite URL printed in the terminal. For server development, build once, then run `npm run dev:server`. Rebuild after UI changes to refresh the HTML served by the MCP server. Stop the production server first if using the same port.

`PORT` defaults to `3000`; the server binds to `0.0.0.0`.

```sh
PORT=3001 npm start
```

## How it works

- `shared/comparison.ts`: shared Zod input/output schema, sample data, formatting and text fallback.
- `shared/plan-comparison.ts`: typed three-plan feature-matrix schema, bilingual sample data and text fallback.
- `src/SmartCompare.tsx`: reusable React component, independent of MCP.
- `src/PlanComparison.tsx`: reusable React implementation of the Figma plan-comparison frame.
- `src/main.tsx`: MCP Apps bridge. Registers tool-result handlers before connecting; receives `structuredContent` and sends preference changes via `updateModelContext`.
- `server/app.ts`: registers `compare_options`, `compare_plans` and their versioned UI resources with the official MCP Apps helpers.
- `server/index.ts`: Node HTTP server with stateless Streamable HTTP, JSON responses, preview and health endpoints.
- `scripts/inline-ui.mjs`: embeds built JS/CSS in a single HTML resource, so the sandbox needs no external assets or network access.

The official TypeScript SDK v2 is published as split packages (`@modelcontextprotocol/server`, `@modelcontextprotocol/node`, and the test-only `@modelcontextprotocol/client`). The official Apps extension is `@modelcontextprotocol/ext-apps`. Versions are pinned in `package-lock.json`.

Tool metadata uses `_meta.ui.resourceUri`, with `openai/outputTemplate` as a ChatGPT compatibility alias. The resource uses `text/html;profile=mcp-app` and declares empty CSP domain lists. The tool returns both `structuredContent` and readable text, including descriptions, prices and features, for clients without UI support. Selection stays in the current UI and is shared with supporting hosts as model context; it does not send a new chat message or persist after reload. If sharing fails, the UI reports that explicitly.

Standalone mode uses sample data only when opened as a top-level browser page. An embedded MCP view waits for real assistant data and does not silently show samples. Plain strings stay as supplied when switching languages; provide `{ "en": "...", "es": "..." }` values when both translations are desired.

## Example tool arguments

```json
{
  "title": { "en": "Choose a plan", "es": "Elige un plan" },
  "language": "en",
  "options": [
    {
      "id": "basic",
      "name": "Basic",
      "description": { "en": "For personal projects", "es": "Para proyectos personales" },
      "price": { "amount": 12, "currency": "USD", "period": { "en": "month", "es": "mes" } },
      "features": [{ "en": "5 GB storage", "es": "5 GB de almacenamiento" }]
    },
    {
      "id": "pro",
      "name": "Pro",
      "description": { "en": "For teams", "es": "Para equipos" },
      "price": { "amount": 24, "currency": "USD", "period": { "en": "month", "es": "mes" } },
      "features": [{ "en": "100 GB storage", "es": "100 GB de almacenamiento" }]
    }
  ]
}
```

Exactly two options are required, with distinct IDs, nonnegative numeric amounts, uppercase three-letter currency codes, and 1–20 features. Omit `period` for a one-time price. `language` defaults to `en`. The bilingual workspace sample is in `shared/comparison.ts`.

## Testing

```sh
npm run build
npm test
```

The tests use the official MCP client against an actual ephemeral HTTP server. They cover health, preview, tool/resource discovery, resource MIME type and self-contained bundle, English/Spanish structured results and fallbacks, custom assistant data, invalid inputs, and disallowed browser origins.

Manual UI check: open `/preview` and compare the implementation with the Figma frame. The table scrolls horizontally when the host is narrower than its 1040px design width. Open `/preview?component=smartcompare` to test the original two-option interaction. To test the full host bridge, connect an MCP Apps-capable assistant and ask it to compare three plans with pricing and grouped features in English or Spanish. A browser preview alone does not exercise host model-context delivery.

## Docker and Easypanel

The root Dockerfile builds React and TypeScript in a Node 22 build stage, then installs production dependencies into a non-root runtime image.

```sh
docker build -t smartcompare .
docker run --rm -p 3000:3000 smartcompare
```

In Easypanel:

1. Create an **App** service using this repository as its source.
2. Select the **Dockerfile** build method, context `.`, Dockerfile `Dockerfile`.
3. Set the service's internal HTTP port to **3000**; leave `PORT=3000` (or match the internal port to your custom `PORT`).
4. Add a public domain and enable HTTPS. Route the domain to this service; preserve the `/mcp` path.
5. Deploy, then verify `https://YOUR-DOMAIN/health` returns HTTP 200 and `{ "status": "ok" }`. Use `https://YOUR-DOMAIN/mcp` as the assistant connection URL.

No volumes or other services are needed. A Docker health check is included. The service is stateless, so replicas do not require sticky sessions.

## Connect an assistant / ChatGPT

Use a client that supports Streamable HTTP and the MCP Apps UI extension. In ChatGPT's developer app/plugin connection flow (when available for your account/workspace), add your public HTTPS `/mcp` URL with no authentication, then ask: “Compare Essential at $12/month and Studio at $24/month, with English and Spanish descriptions and features.” The assistant should call `compare_options` with complete data. UI rendering depends on the client's MCP Apps support; other MCP clients receive the same data and text fallback.

Local ChatGPT testing needs a public HTTPS tunnel to port 3000 or the Easypanel deployment; ChatGPT cannot connect to your machine's `localhost`. Actual ChatGPT account connection and rendering must be verified in that host after deployment.

Browser-origin requests to `/mcp` are rejected by default. If using a browser-based MCP inspector, explicitly allow its exact origin:

```sh
ALLOWED_ORIGINS=http://localhost:6274 npm start
```

Separate multiple trusted origins with commas. Requests without an `Origin` header (normal assistant/server connections) work without this setting. This is an unauthenticated, read-only proof of concept with no stored user data.

## Official references

- [MCP Apps specification](https://modelcontextprotocol.io/docs/extensions/apps)
- [MCP Apps SDK quickstart](https://github.com/modelcontextprotocol/ext-apps/blob/main/docs/quickstart.md)
- [Official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [OpenAI: Add UI to your MCP server](https://developers.openai.com/plugins/build/chatgpt-ui) — standards-first bridge and ChatGPT compatibility aliases.
- [OpenAI: Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)
