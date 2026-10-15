import { searchX } from "../lib/apify-x";

const topic = process.argv.slice(2).join(" ").trim();
if (!topic) {
  console.error('Usage: npm run check:x -- "customer pain point"');
  process.exitCode = 1;
} else {
  try {
    const result = await searchX(topic);
    console.log(JSON.stringify({ query: result.query, count: result.posts.length, firstUrl: result.posts[0]?.url ?? null, retrievedAt: result.retrievedAt }, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "X search failed");
    process.exitCode = 1;
  }
}
