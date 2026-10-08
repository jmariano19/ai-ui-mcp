import { McpServer } from '@modelcontextprotocol/server';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { comparisonSchema, textFallback } from '../shared/comparison.js';
export const RESOURCE_URI = 'ui://smartcompare/v1.html';
export function createMcpServer(html: string) {
  const server = new McpServer({ name: 'smartcompare-components', version: '0.1.0' });
  registerAppTool(server, 'compare_options', {
    title: 'SmartCompare',
    description: 'Compare exactly two options in an interactive English or Spanish UI. Provide names, descriptions, numeric prices with ISO currency codes, and features. Use bilingual {en, es} text to enable translation, or plain strings in the requested language. IDs must be distinct.',
    inputSchema: comparisonSchema,
    outputSchema: comparisonSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { ui: { resourceUri: RESOURCE_URI }, 'openai/outputTemplate': RESOURCE_URI },
  }, async data => ({ structuredContent: data, content: [{ type: 'text', text: textFallback(data) }] }));
  registerAppResource(server, 'SmartCompare UI', RESOURCE_URI, { mimeType: RESOURCE_MIME_TYPE }, async () => ({ contents: [{
    uri: RESOURCE_URI, mimeType: RESOURCE_MIME_TYPE, text: html,
    _meta: { ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains: [] } }, 'openai/widgetDescription': 'Two-option comparison with a language toggle and preference selection.' },
  }] }));
  return server;
}
