import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const dataDir = await mkdtemp(path.join(tmpdir(), "threadly-test-"));
process.env.THREADLY_DATA_DIR = dataDir;
const data = await import("../lib/data");

const fixture = {id:'12345',text:'How can we improve customer onboarding?',author:'founder',url:'https://x.com/i/web/status/12345',createdAt:'2026-10-15T08:00:00Z',metrics:null};
async function sourceFor(email: string) {
  await data.getState(email);
  await data.storeXResults(email,[fixture],'Apify');
  return `${email}-x-${fixture.id}`;
}
test("concurrent first loads contain no fabricated posts or drafts", async () => {
  const states = await Promise.all([data.getState('demo@threadly.app'),data.getState('demo@threadly.app')]);
  for (const state of states) {assert.equal(state.opportunities.length,0);assert.equal(state.drafts.length,0);}
});
test("X results persist once, preserve source, and stay workspace scoped", async () => {
  const email='founder@example.com';
  const id=await sourceFor(email);
  await data.updateOpportunity(email,id,'saved');
  await sourceFor(email);
  const state=await data.getState(email);
  assert.equal(state.opportunities.length,1);
  assert.equal(state.opportunities[0].source_kind,'x_apify');
  assert.equal(state.opportunities[0].body,fixture.text);
  assert.equal(state.opportunities[0].source_url,fixture.url);
  assert.equal(state.opportunities[0].intent,'Unrated');
  assert.equal(state.opportunities[0].status,'saved');
  assert.equal((await data.getState('outsider@example.com')).opportunities.length,0);
});
test("legacy non-X records and sample records are not returned", async () => {
  const {database}=await import('../lib/db');
  const email='legacy@example.com'; await data.getState(email);const db=await database(email);
  await db.query("INSERT INTO opportunities (id,workspace_id,platform,community,author,title,body,pain,intent,relevance,engagement,source_kind) VALUES ('old-hn',$1,'Hacker News','','','old post','','','Unrated',0,'','hn'),('old-sample',$1,'X','','','sample post','','','High',99,'','demo')",[email]);
  assert.equal((await data.getState(email)).opportunities.length,0);
});

test("draft approval, reminder changes, manual publication, and duplication", async () => {
  const email = "author@example.com";
  await data.getState(email);
  const sourceId = await sourceFor(email);
  const source = (await data.getState(email)).opportunities.find(opportunity => opportunity.id === sourceId);
  assert.ok(source);
  const id = await data.saveDraft(email, { opportunityId: source.id, platform: source.platform, kind: "Discussion response", text: "A useful answer" });
  await assert.rejects(data.scheduleDraft(email, id, "2026-11-05T12:00:00Z"));
  await data.approveDraft(email, id);
  assert.equal((await data.getState(email)).drafts.find(draft => draft.id === id)?.approved_by, email);
  await data.scheduleDraft(email, id, "2026-11-05T12:00:00Z");
  await data.scheduleDraft(email, id, "2026-11-06T12:00:00Z");
  let state = await data.getState(email);
  assert.equal(state.drafts.find(draft => draft.id === id)?.status, "scheduled");
  await data.cancelSchedule(email, id);
  state = await data.getState(email);
  assert.equal(state.drafts.find(draft => draft.id === id)?.status, "approved");
  await data.scheduleDraft(email, id, "2026-11-07T12:00:00Z");
  await data.markPublished(email, id);
  await data.duplicateDraft(email, id);
  state = await data.getState(email);
  assert.equal(state.drafts.find(draft => draft.id === id)?.status, "published");
  assert.equal(state.drafts.filter(draft => draft.text === "A useful answer").length, 2);
  assert.equal(state.drafts.find(draft => draft.id !== id && draft.text === "A useful answer")?.status, "draft");
});

test("workspace data is isolated", async () => {
  const owner = "owner@example.com";
  const other = "other@example.com";
  await data.getState(owner);
  const sourceId = await sourceFor(owner);
  const source = (await data.getState(owner)).opportunities.find(opportunity => opportunity.id === sourceId);
  assert.ok(source);
  await data.getState(other);
  await data.saveLead(owner, { opportunityId: source.id, name: "Jordan", platform: source.platform });
  await assert.rejects(data.saveLead(other, { opportunityId: source.id, name: "Wrong", platform: source.platform }));
  assert.equal((await data.getState(owner)).leads.length, 1);
  assert.equal((await data.getState(other)).leads.length, 0);
});

test.after(async () => {
  await rm(dataDir, { recursive: true, force: true });
});
