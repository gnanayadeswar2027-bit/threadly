import test from 'node:test';
import assert from 'node:assert/strict';
import { searchApifyX } from '../lib/apify-x';

test('Apify search maps real records, removes duplicates and never invents metrics', async () => {
  const fetcher = (async (_url: unknown, init?: RequestInit) => {
    const input = JSON.parse(String(init?.body));
    assert.equal(input.maxItems, 10);
    assert.match(input.searchTerms[0], /"customer onboarding"/);
    return Response.json([{id:'123',text:'Need help with customer onboarding',createdAt:'2026-10-15T08:00:00Z',author:{userName:'founder'}},{id:'123',text:'duplicate'}]);
  }) as typeof fetch;
  const result = await searchApifyX('customer onboarding', 'test-token', fetcher);
  assert.equal(result.posts.length, 1);
  assert.equal(result.posts[0].url, 'https://x.com/i/web/status/123');
  assert.equal(result.posts[0].metrics, null);
  assert.equal(result.posts[0].author, 'founder');
});
test('Apify errors are not empty success results', async () => {
  for (const payload of [{error:'failed'},[{error:'No access'}]]) {
    await assert.rejects(searchApifyX('onboarding', 'test-token', (async () => Response.json(payload)) as typeof fetch), /unreadable|failed/i);
  }
  await assert.rejects(searchApifyX('onboarding', undefined), /not connected/);
});
