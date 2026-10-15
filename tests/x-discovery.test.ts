import assert from "node:assert/strict";
import test from "node:test";
import { buildXQuery, searchRecentX, topicFromContext } from "../lib/x-discovery";

test("empty search is distinguished from malformed and partial responses", async () => {
  const respond = (payload: unknown) => (async () => Response.json(payload)) as typeof fetch;
  assert.equal((await searchRecentX("customers", "test-token", respond({ meta: { result_count: 0 } }))).posts.length, 0);
  for (const payload of [null, {}, { errors: [{ title: "Unavailable" }] }]) {
    await assert.rejects(searchRecentX("customers", "test-token", respond(payload)), /incomplete/);
  }
});

test("search query uses a literal customer topic and excludes reposts", () => {
  assert.equal(buildXQuery('  finding first customers  '), '"finding first customers" lang:en -is:retweet');
  assert.equal(buildXQuery('"founder" (growth)'), '"founder growth" lang:en -is:retweet');
  assert.throws(() => buildXQuery(" "));
});

test("company profile picks one pain point for a focused search", () => {
  assert.equal(topicFromContext({ painPoints: "Finding first customers, reducing churn", customer: "Founders" }), "Finding first customers");
  assert.equal(topicFromContext({ painPoints: "", customer: "Solo founders" }), "Solo founders");
  assert.throws(() => topicFromContext({ painPoints: "", customer: "" }), /search topic/);
});

test("recent search returns real provider records without inventing metadata", async () => {
  let requestUrl = "";
  let requestAuth = "";
  const fetcher = (async (input: URL | RequestInfo, init?: RequestInit) => {
    requestUrl = String(input);
    requestAuth = new Headers(init?.headers).get("Authorization") || "";
    return Response.json({ data: [
      { id: "12345", text: "How do I find first customers?", created_at: "2026-10-15T08:00:00Z", public_metrics: { like_count: 4, reply_count: 2, retweet_count: 1 } },
      { id: "bad", text: "Invalid" },
    ] });
  }) as typeof fetch;
  const result = await searchRecentX("first customers", "test-token", fetcher);
  assert.equal(new URL(requestUrl).pathname, "/2/tweets/search/recent");
  assert.equal(new URL(requestUrl).searchParams.get("max_results"), "10");
  assert.equal(requestAuth, "Bearer test-token");
  assert.equal(result.posts.length, 1);
  assert.equal(result.posts[0].url, "https://x.com/i/web/status/12345");
  assert.deepEqual(result.posts[0].metrics, { likes: 4, replies: 2, reposts: 1 });
});

test("missing credentials and provider failure never return sample posts", async () => {
  await assert.rejects(searchRecentX("first customers", undefined), /not connected/);
  const unauthorized = (async () => new Response(null, { status: 401 })) as typeof fetch;
  await assert.rejects(searchRecentX("first customers", "test-token", unauthorized), /rejected/);
});
