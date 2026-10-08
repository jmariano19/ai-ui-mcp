import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createHttpServer } from '../server/index.js';
import { PLAN_RESOURCE_URI, RESOURCE_URI } from '../server/app.js';
import { comparisonSchema, sampleComparison } from '../shared/comparison.js';
import { planComparisonSchema, samplePlanComparison } from '../shared/plan-comparison.js';

test('production HTTP app: health, discovery, calls, resource, validation and isolation', async () => {
  const html = await readFile(new URL('../dist/ui/index.html', import.meta.url), 'utf8');
  const server = await createHttpServer(html);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const client = new Client({ name: 'smartcompare-test', version: '1.0.0' });
  try {
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.deepEqual(await (await fetch(`${base}/health`)).json(), { status: 'ok' });
    assert.equal(await (await fetch(`${base}/preview`)).text(), html);
    assert.equal((await fetch(`${base}/missing`)).status, 404);
    assert.equal((await fetch(`${base}/mcp`, { method: 'POST', headers: { Origin: 'https://untrusted.example' } })).status, 403);
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
    const { tools } = await client.listTools();
    assert.equal(tools.length, 2);
    const compareOptions = tools.find(tool => tool.name === 'compare_options');
    const comparePlans = tools.find(tool => tool.name === 'compare_plans');
    assert.ok(compareOptions);
    assert.ok(comparePlans);
    assert.deepEqual(compareOptions._meta?.ui, { resourceUri: RESOURCE_URI });
    assert.equal(compareOptions._meta?.['openai/outputTemplate'], RESOURCE_URI);
    assert.deepEqual(comparePlans._meta?.ui, { resourceUri: PLAN_RESOURCE_URI });
    assert.equal(comparePlans._meta?.['openai/outputTemplate'], PLAN_RESOURCE_URI);
    const { resources } = await client.listResources();
    assert.deepEqual(new Set(resources.map(resource => resource.uri)), new Set([RESOURCE_URI, PLAN_RESOURCE_URI]));
    const resource = await client.readResource({ uri: RESOURCE_URI });
    assert.equal(resource.contents[0].mimeType, 'text/html;profile=mcp-app');
    assert.ok('text' in resource.contents[0]);
    assert.equal(resource.contents[0].text, html);
    assert.ok(!/<script[^>]+src=|<link[^>]+href=/.test(html), 'UI must have no external JS or CSS');
    for (const language of ['en', 'es'] as const) {
      const input = { ...sampleComparison, language };
      const result = await client.callTool({ name: 'compare_options', arguments: input });
      assert.deepEqual(result.structuredContent, input);
      assert.equal(result.isError, undefined);
      assert.ok(Array.isArray(result.content));
      const text = result.content[0];
      assert.ok(text.type === 'text');
      assert.match(text.text, language === 'es' ? /Proyectos personales/ : /Unlimited personal projects/);
      assert.match(text.text, /12/);
    }
    const dynamic = { title: 'Custom comparison', options: sampleComparison.options.map((o, i) => ({ ...o, id: `custom-${i}`, name: `Dynamic ${i}` })) };
    const dynamicResult = await client.callTool({ name: 'compare_options', arguments: dynamic });
    assert.equal((dynamicResult.structuredContent as { language: string }).language, 'en');
    assert.equal((dynamicResult.structuredContent as { title: string }).title, 'Custom comparison');
    const bad = await client.callTool({ name: 'compare_options', arguments: { ...sampleComparison, options: [sampleComparison.options[0], sampleComparison.options[0]] } });
    assert.equal(bad.isError, true);
    const wrongCount = await client.callTool({ name: 'compare_options', arguments: { ...sampleComparison, options: [sampleComparison.options[0]] } });
    assert.equal(wrongCount.isError, true);
    for (const language of ['en', 'es'] as const) {
      const input = { ...samplePlanComparison, language };
      const result = await client.callTool({ name: 'compare_plans', arguments: input });
      assert.deepEqual(result.structuredContent, input);
      assert.equal(result.isError, undefined);
      const text = result.content[0];
      assert.ok(text.type === 'text');
      assert.match(text.text, language === 'es' ? /Miembros del equipo/ : /Team members/);
      assert.match(text.text, language === 'es' ? /Incluido/ : /Included/);
    }
    const planResource = await client.readResource({ uri: PLAN_RESOURCE_URI });
    assert.equal(planResource.contents[0].mimeType, 'text/html;profile=mcp-app');
    assert.ok('text' in planResource.contents[0]);
    assert.equal(planResource.contents[0].text, html);
  } finally {
    await client.close();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
test('schema rejects negative prices and invalid currencies', () => {
  assert.equal(comparisonSchema.safeParse({ ...sampleComparison, options: [{ ...sampleComparison.options[0], price: { amount: -1, currency: 'USD' } }, sampleComparison.options[1]] }).success, false);
  assert.equal(comparisonSchema.safeParse({ ...sampleComparison, options: [{ ...sampleComparison.options[0], price: { amount: 5, currency: 'usd' } }, sampleComparison.options[1]] }).success, false);
});
test('plan schema validates three distinct plans and a valid recommendation', () => {
  assert.equal(planComparisonSchema.safeParse(samplePlanComparison).success, true);
  assert.equal(planComparisonSchema.safeParse({ ...samplePlanComparison, recommendedPlanId: 'missing' }).success, false);
  assert.equal(planComparisonSchema.safeParse({ ...samplePlanComparison, plans: [samplePlanComparison.plans[0], samplePlanComparison.plans[0], samplePlanComparison.plans[2]] }).success, false);
  assert.equal(planComparisonSchema.safeParse({ ...samplePlanComparison, plans: samplePlanComparison.plans.slice(0, 2) }).success, false);
});
