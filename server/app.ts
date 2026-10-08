import { McpServer } from '@modelcontextprotocol/server';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { comparisonSchema, textFallback } from '../shared/comparison.js';
import { planComparisonSchema, planComparisonTextFallback } from '../shared/plan-comparison.js';
export const RESOURCE_URI = 'ui://smartcompare/v1.html';
export const PLAN_RESOURCE_URI = 'ui://plan-comparison/v1.html';
export function createMcpServer(html: string) {
  const server = new McpServer({ name: 'mcp-components', version: '0.2.0' });
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
  registerAppTool(server, 'compare_plans', {
    title: 'Plan Comparison',
    description: 'Compare exactly three subscription, service, or product plans in a visual feature matrix. Use when the user needs to compare plan pricing and feature availability across three tiers. Supply grouped feature rows, English or Spanish text, and optionally identify one recommended plan.',
    inputSchema: planComparisonSchema,
    outputSchema: planComparisonSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { ui: { resourceUri: PLAN_RESOURCE_URI }, 'openai/outputTemplate': PLAN_RESOURCE_URI },
  }, async data => ({ structuredContent: data, content: [{ type: 'text', text: planComparisonTextFallback(data) }] }));
  registerAppResource(server, 'Plan Comparison UI', PLAN_RESOURCE_URI, { mimeType: RESOURCE_MIME_TYPE }, async () => ({ contents: [{
    uri: PLAN_RESOURCE_URI, mimeType: RESOURCE_MIME_TYPE, text: html,
    _meta: { ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains: [] } }, 'openai/widgetDescription': 'Three-plan pricing and feature comparison table that renders assistant-provided English or Spanish content.' },
  }] }));
  return server;
}
