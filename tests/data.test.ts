import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const dataDir = await mkdtemp(path.join(tmpdir(), "threadly-test-"));
process.env.THREADLY_DATA_DIR = dataDir;
const data = await import("../lib/data");

test("concurrent first loads create only one sample set", async () => {
  const email = "demo@threadly.app";
  const [first, second] = await Promise.all([data.getState(email), data.getState(email)]);
  assert.equal(first.opportunities.length, 6);
  assert.equal(second.opportunities.length, 6);
  assert.equal(first.drafts.length, 1);
  assert.equal(second.drafts.length, 1);
  const later = await data.getState(email);
  assert.equal(later.opportunities.length, 6);
  assert.equal(later.drafts.length, 1);
});

test("a new real workspace starts empty and can save a Reddit conversation once", async () => {
  const email = "founder@example.com";
  const initial = await data.getState(email);
  assert.equal(initial.demo, false);
  assert.equal(initial.opportunities.length, 0);
  assert.equal(initial.drafts.length, 0);
  assert.equal(initial.workspace.context.description, "");

  const input = {
    url: "https://www.reddit.com/r/SaaS/comments/abc123/a_question/?utm_source=share",
    title: "Founder asks about first customers",
    body: "I want to answer their question about finding early users.",
    pain: "Customer acquisition",
    intent: "High",
  };
  const id = await data.saveManualOpportunity(email, input);
  const duplicateId = await data.saveManualOpportunity(email, { ...input, url: "https://old.reddit.com/r/SaaS/comments/abc123/a_question/" });
  assert.equal(duplicateId, id);
  const state = await data.getState(email);
  assert.equal(state.opportunities.length, 1);
  assert.equal(state.opportunities[0].source_kind, "manual");
  assert.equal(state.opportunities[0].source_url, "https://www.reddit.com/r/SaaS/comments/abc123/");
  assert.equal(state.opportunities[0].relevance, 0);
  assert.equal(state.opportunities[0].community, "r/SaaS");
  assert.equal((await data.getState("other-founder@example.com")).opportunities.length, 0);
});

test("manual capture rejects non-post URLs and empty notes", async () => {
  const email = "validator@example.com";
  await data.getState(email);
  const input = { url: "https://www.reddit.com/r/SaaS/comments/abc123/a_question/", title: "A useful note", body: "My own summary", pain: "", intent: "Medium" };
  await assert.rejects(data.saveManualOpportunity(email, { ...input, url: "https://reddit.com.evil.example/r/SaaS/comments/abc123/" }));
  await assert.rejects(data.saveManualOpportunity(email, { ...input, url: "https://www.reddit.com/r/SaaS/" }));
  await assert.rejects(data.saveManualOpportunity(email, { ...input, title: "  " }));
});

test("draft approval, reminder changes, manual publication, and duplication", async () => {
  const email = "author@example.com";
  await data.getState(email);
  const sourceId = await data.saveManualOpportunity(email, { url: "https://www.reddit.com/r/SaaS/comments/def456/a_question/", title: "A founder question", body: "What I noticed", pain: "Acquisition", intent: "High" });
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
  const sourceId = await data.saveManualOpportunity(owner, { url: "https://www.reddit.com/r/startups/comments/ghi789/topic/", title: "A question", body: "My note", pain: "Growth", intent: "Medium" });
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
